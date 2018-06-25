#!/bin/bash
#
# NPM: Uglify Tasks
#
# These are a little too cumbersome to deal with inside NPM.
##



# Check dependencies.
command -v uglifyjs >/dev/null 2>&1 || {
	echo -e "\033[31;1mError:\033[0m uglifyjs must be in \$PATH."
	echo -e "\033[96;1mFix:\033[0m npm i uglify-es -g"
	exit 1
}



echo -e "\033[2mcompiling:\033[0m blobselect.js"
uglifyjs -c -m -o "dist/blobselect.min.js" -- "src/js/blobselect.js"
if [ $? != 0 ]; then
	notify-send -i error --category dev.validate -h int:transient:1 -t 3000 "Uglify-es: Error" "Your Javascript did not validate."
	exit 1
fi



# We're done!
echo -e "\033[32;1mSuccess:\033[0m Uglification has completed!"
exit 0
