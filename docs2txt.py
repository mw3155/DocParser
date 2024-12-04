import ast
import logging
from pathlib import Path
import argparse
from typing import List, Dict


class DocExtractor(ast.NodeVisitor):
    def __init__(self):
        self.docs: List[str] = []
        self.indent_level = 0

    def visit_Module(self, node: ast.Module) -> None:
        docstring = ast.get_docstring(node)
        if docstring:
            self.add_section("Module", docstring)
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.add_section("Class", node.name, ast.get_docstring(node))
        self.indent_level += 1
        self.generic_visit(node)
        self.indent_level -= 1

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        args = [arg.arg for arg in node.args.args]
        args_str = ", ".join(args)
        signature = f"{node.name}({args_str})"
        self.add_section(
            "Method" if self.indent_level else "Function",
            signature,
            ast.get_docstring(node),
        )

    def add_section(
        self, section_type: str, signature: str, docstring: str = None
    ) -> None:
        indent = "    " * self.indent_level
        self.docs.append(f"\n{indent}{section_type}: {signature}")
        self.docs.append(f"{indent}{'=' * (len(section_type) + len(signature) + 2)}")
        if docstring:
            for line in docstring.split("\n"):
                self.docs.append(f"{indent}{line.strip()}")


def process_file(file_path: Path) -> str:
    try:
        source = file_path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        extractor = DocExtractor()
        extractor.visit(tree)
        return "\n".join(
            [f"\nFile: {file_path}", "=" * (len(str(file_path)) + 6)] + extractor.docs
        )
    except Exception as e:
        return f"Error processing {file_path}: {str(e)}"


def extract_all_docs(folder_path: Path, output_file: Path):
    results = []

    # Process all Python files recursively
    for py_file in folder_path.rglob("*.py"):
        if not any(
            part.startswith(".") for part in py_file.parts
        ):  # Skip hidden directories
            logging.info(f"Processing {py_file}")
            doc = process_file(py_file)
            results.append(doc)

    # Write combined results
    output_file.write_text("\n\n".join(results), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Extract documentation from Python files"
    )
    parser.add_argument(
        "folder_path", type=Path, help="Path to folder containing Python files"
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("documentation.txt"),
        help="Output file path (default: documentation.txt)",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Enable verbose logging"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.INFO)

    if not args.folder_path.exists():
        raise FileNotFoundError(f"Folder {args.folder_path} does not exist")

    extract_all_docs(args.folder_path, args.output)
    print(f"Documentation written to {args.output}")


if __name__ == "__main__":
    main()
