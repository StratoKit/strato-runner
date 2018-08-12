#!/bin/sh
BUILDDIR=dist

function die() {
	echo "!!! $* !!!" >&2
	exit 1
}
function cleanGit() {
	# This undoes the last commit but leaves the build in place
	git reset HEAD^
}

if ! git diff --quiet; then
	die Repo is not clean
fi

CURRENT=`git branch --no-color 2> /dev/null | sed -e '/^[^*]/d' -e 's/^\* //'`
if [ -z "$ORIGIN" ]; then
	ORIGIN=`git config branch.$CURRENT.remote`
	[ -n "$ORIGIN" ] || die "Cannot determine origin, are you on a branch? Define ORIGIN=..."
fi

if [ $1 ]; then
	CURRENT=$1
fi

B=${CURRENT}-build
echo "=== Building and pushing to $ORIGIN/$B ==="

nps test.full || die Tests failed
nps build || die Could not build
git add -f $BUILDDIR || die Could not add to commit
git commit -m build || die Could not commit

if ! git push -f "$ORIGIN" "HEAD:$B"; then
	cleanGit
	die Could not push to $ORIGIN/$B
fi

cleanGit || die Could not clean temporary commit
