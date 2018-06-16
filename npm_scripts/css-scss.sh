#!/bin/bash
#
# NPM: SCSS
#
# These are a little too cumbersome to deal with inside NPM.
##



# Check dependencies.
command -v sassc >/dev/null 2>&1 || {
	echo -e "\033[31;1mError:\033[0m sassc must be in \$PATH."
	exit 1
}
command -v stylecow >/dev/null 2>&1 || {
	echo -e "\033[31;1mError:\033[0m stylecow must be in \$PATH."
	echo -e "\033[96;1mFix:\033[0m npm i stylecow -g"
	exit 1
}



# Compile the SCSS.
declare -A SOURCES
SOURCES["dist/css/blobselect.css"]="src/scss/blobselect.scss"
SOURCES["dist/css/blobfolio.css"]="src/scss/blobfolio.scss"
SOURCES["dist/css/reset.css"]="src/scss/reset.scss"

# Now loop through and compile!
for i in "${!SOURCES[@]}"
do
	echo -e "\033[2mcompiling:\033[0m $( basename "${SOURCES[$i]}" )"
	sassc --style=compressed "${SOURCES[$i]}" "${i}"
	if [ $? != 0 ]; then
		notify-send -i error --category dev.validate -h int:transient:1 -t 3000 "SCSS: Error" "Your SCSS did not validate."
		exit 1
	fi
done



# Run postcss clean ups.
stylecow -c stylecow.json



exit 0
