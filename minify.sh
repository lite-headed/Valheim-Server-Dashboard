#!/bin/bash

# Deletes and then creates minified version of the server status webpage files

# Set the output directory
OUTPUT_DIR="/mnt/data-disk/valheim-server/data/htdocs"
INPUT_DIR=$(dirname "$0")

# Function to check the success of a command
check_success() {
  if [ $? -ne 0 ]; then
    echo -e "\033[31mError: $1 failed.\033[0m\n"  # Red error message
    exit 1
  else
    echo -e "\033[32m$1 succeeded.\033[0m\n"  # Green success message
  fi
}

# Ensure the output directory exists, exits if not
if [ ! -d "$OUTPUT_DIR" ]; then
  echo -e "\033[31mOutput directory does not exist\033[0m"  # Red error message
  exit
fi

# Ensure the output files exist, exits if not
# Ensure the input files exist, exits if not
for file in "index.html" "styles.css" "scripts.js"; do
  if [ ! -f "$INPUT_DIR/$file" ]; then
    echo -e "\033[31mError: $file not found in input directory ($INPUT_DIR)\033[0m"  # Red error message
    exit 1
  fi
done

# Delete existing files in the output directory if they exist
echo "Deleting:"
echo " - index.html"
echo " - styles.css"
echo " - scripts.js"
echo "in $OUTPUT_DIR"
rm -f "$OUTPUT_DIR/index.html" "$OUTPUT_DIR/styles.css" "$OUTPUT_DIR/scripts.js"
check_success "Files deletion"

# Minify HTML file (overwrite the original file)
echo "Minifying index.html..."
html-minifier-terser "$INPUT_DIR/index.html" -o "$OUTPUT_DIR/index.html" \
  --collapse-whitespace \
  --remove-comments \
  --remove-attribute-quotes \
  --remove-optional-tags \
  --minify-css true \
  --minify-js true \
  --remove-redundant-attributes \
  --use-short-doctype \
  --sort-attributes \
  --sort-class-name \
  --remove-script-type-attributes \
  --remove-style-link-type-attributes

check_success "HTML minification"

# Minify CSS file (overwrite the original file)
echo "Minifying styles.css..."
csso "$INPUT_DIR/styles.css" -o "$OUTPUT_DIR/styles.css" --comments none
check_success "CSS minification"

# Minify JS file (overwrite the original file)
echo "Minifying scripts.js..."
terser "$INPUT_DIR/scripts.js" -o "$OUTPUT_DIR/scripts.js" \
  --compress \
  --mangle \
  --comments false \
  --ecma 2015 \
  --toplevel
check_success "JavaScript minification"

# Check if the minified files exist in the output directory
echo "Checking if files exist in $OUTPUT_DIR..."
for file in "index.html" "styles.css" "scripts.js"; do
  if [ -f "$OUTPUT_DIR/$file" ]; then
    echo -e "\033[32m - $file exists.\033[0m"  # Green message for success
  else
    echo -e "\033[31m - $file does not exist.\033[0m"  # Red message for failure
    exit 1
  fi
done

# Print completion message
echo -e "\033[32m\nMinification completed successfully!\033[0m"  # Green success message
