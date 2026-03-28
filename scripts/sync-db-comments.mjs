import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import ts from "typescript";

const cliArgs = process.argv.slice(2);
const args = new Set(cliArgs);
const cwd = process.cwd();
const shouldApply = args.has("--apply");
const shouldWrite = args.has("--write") || !shouldApply;
const shouldCreateMigration = args.has("--migration");
const schemaArg = cliArgs.find((item) => item.startsWith("--schema="));
const outArg = cliArgs.find((item) => item.startsWith("--out="));
const schemaPath = path.resolve(
  cwd,
  schemaArg?.slice("--schema=".length) ?? "server/database/schema.ts",
);
const defaultOutputPath = shouldCreateMigration
  ? path.resolve(cwd, "drizzle", `${Date.now()}_sync_comments.sql`)
  : fileURLToPath(new URL("../drizzle/manual/comments.sql", import.meta.url));
const outputPath = path.resolve(
  cwd,
  outArg?.slice("--out=".length) ?? defaultOutputPath,
);
const envPath = fileURLToPath(new URL("../.env", import.meta.url));

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  try {
    const rawEnv = await readFile(envPath, "utf8");
    const line = rawEnv
      .split("\n")
      .map((item) => item.trim())
      .find(
        (item) =>
          item.startsWith("DATABASE_URL=") && !item.startsWith("#DATABASE_URL="),
      );

    if (!line) {
      return null;
    }

    const value = line.slice("DATABASE_URL=".length).trim();
    return value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  } catch {
    return null;
  }
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function cleanJsDoc(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNodeJsDoc(sourceText, node) {
  const leadingText = sourceText.slice(node.getFullStart(), node.getStart());
  const matches = [...leadingText.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
  const lastMatch = matches.at(-1);
  if (!lastMatch) {
    return null;
  }

  const commentText = cleanJsDoc(lastMatch[1] ?? "");
  return commentText || null;
}

function getCallExpressionName(node) {
  if (ts.isIdentifier(node)) {
    return node.text;
  }

  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }

  return null;
}

function extractDbColumnName(expression) {
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }

  if (ts.isCallExpression(expression)) {
    const nestedColumnName = extractDbColumnName(expression.expression);
    if (nestedColumnName) {
      return nestedColumnName;
    }

    const firstArg = expression.arguments[0];
    if (firstArg && ts.isStringLiteralLike(firstArg)) {
      return firstArg.text;
    }
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return extractDbColumnName(expression.expression);
  }

  if (ts.isParenthesizedExpression(expression)) {
    return extractDbColumnName(expression.expression);
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return extractDbColumnName(expression.expression);
  }

  if (ts.isNonNullExpression(expression)) {
    return extractDbColumnName(expression.expression);
  }

  return null;
}

function collectCommentStatements(schemaFilePath) {
  const sourceText = ts.sys.readFile(schemaFilePath);
  if (!sourceText) {
    throw new Error(`Unable to read schema file: ${schemaFilePath}`);
  }

  const sourceFile = ts.createSourceFile(
    schemaFilePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const statements = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    const tableComment = getNodeJsDoc(sourceText, statement);

    for (const declaration of statement.declarationList.declarations) {
      if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
        continue;
      }

      const initializer = declaration.initializer;
      if (getCallExpressionName(initializer.expression) !== "pgTable") {
        continue;
      }

      const [tableNameArg, columnsArg] = initializer.arguments;
      if (!tableNameArg || !ts.isStringLiteralLike(tableNameArg)) {
        continue;
      }

      const tableName = tableNameArg.text;
      if (tableComment) {
        statements.push(
          `COMMENT ON TABLE ${quoteIdentifier("public")}.${quoteIdentifier(tableName)} IS ${quoteLiteral(tableComment)};`,
        );
      }

      if (!columnsArg || !ts.isObjectLiteralExpression(columnsArg)) {
        continue;
      }

      for (const property of columnsArg.properties) {
        if (!ts.isPropertyAssignment(property)) {
          continue;
        }

        const columnComment = getNodeJsDoc(sourceText, property);
        if (!columnComment) {
          continue;
        }

        const columnName = extractDbColumnName(property.initializer);
        if (!columnName) {
          continue;
        }

        statements.push(
          `COMMENT ON COLUMN ${quoteIdentifier("public")}.${quoteIdentifier(tableName)}.${quoteIdentifier(columnName)} IS ${quoteLiteral(columnComment)};`,
        );
      }

      if (tableComment) {
        statements.push("");
      }
    }
  }

  return statements.filter((item, index, list) => {
    if (item !== "") {
      return true;
    }

    return index > 0 && list[index - 1] !== "";
  });
}

function buildSql(schemaFilePath) {
  const statements = collectCommentStatements(schemaFilePath);
  if (statements.length === 0) {
    return null;
  }

  return [
    "-- Generated by scripts/sync-db-comments.mjs",
    `-- Source schema: ${path.relative(cwd, schemaFilePath)}`,
    "-- Drizzle does not natively model table/column comments yet.",
    "BEGIN;",
    ...statements,
    "COMMIT;",
    "",
  ].join("\n");
}

async function writeSqlFile(sql) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, sql, "utf8");
  console.log(`Wrote database comments SQL to ${outputPath}`);
}

async function applySql(sql) {
  const databaseUrl = await resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when using --apply");
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  console.log("Applied database comments to PostgreSQL");
}

async function main() {
  const sql = buildSql(schemaPath);
  if (!sql) {
    console.log(`No pgTable JSDoc comments found in ${schemaPath}`);
    return;
  }

  if (shouldWrite) {
    await writeSqlFile(sql);
  }

  if (shouldApply) {
    await applySql(sql);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
