import path from "node:path";
import slugify from "slugify";
import { visit } from "unist-util-visit";

const SEMVER_REGEX = /^v?\d+(\.\d+)?(\.\d+)?$/;

function toPosix(value: string) {
  return value.split(path.sep).join("/");
}

function refineUrlPart(name: string) {
  const lastPart = name.split(/[/:]/).pop() || name;

  if (SEMVER_REGEX.test(lastPart)) {
    return lastPart;
  }

  return lastPart
    .replace(/(\d+\.)?(.*)/, "$2")
    .replace(/^index(\.draft)?$/i, "")
    .replace(/\.draft$/i, "");
}

function generateContentPath(relativePath: string) {
  const slug = relativePath
    .split("/")
    .map((part) =>
      slugify(refineUrlPart(part), {
        lower: true,
        strict: true,
        trim: true,
      }),
    )
    .filter(Boolean)
    .join("/");

  return slug ? `/${slug}` : "/";
}

export default function resolveDocLinks(options: { rootDir: string }) {
  const rootDir = toPosix(options.rootDir).replace(/\/$/, "");

  return (tree: any, file: { path?: string }) => {
    const currentFile = toPosix(file.path || "");
    const currentRelative = currentFile.startsWith(rootDir)
      ? currentFile.slice(rootDir.length).replace(/^\/+/, "")
      : currentFile.replace(/^\/+/, "");
    const currentDir = currentRelative ? path.posix.dirname(currentRelative) : "/";

    visit(tree, "link", (node: any) => {
      const url = node.url;

      if (
        !url ||
        /^https?:\/\//.test(url) ||
        url.startsWith("#") ||
        !url.replace(/#.*$/, "").endsWith(".md")
      ) {
        return;
      }

      const [rawTarget = "", rawHash] = url.split("#");
      const resolved = rawTarget.startsWith("/")
        ? path.posix.normalize(rawTarget)
        : path.posix.normalize(path.posix.join("/", currentDir, rawTarget));

      node.url = `${generateContentPath(resolved.replace(/^\/+/, "").replace(/\.md$/i, ""))}${
        rawHash ? `#${rawHash}` : ""
      }`;
    });
  };
}
