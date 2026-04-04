import type { MDXComponents } from "mdx/types";
import defaultComponents from "fumadocs-ui/mdx";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...components,
  };
}
