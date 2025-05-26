find . -type f -exec shasum -a 256 {} \; > all_hashes.txt
cat all_hashes.txt
