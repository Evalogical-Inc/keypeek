# Record: scripts/demo-home.sh /tmp/keypeek-demo-home && KEYPEEK_REPO=$PWD vhs docs/demo.tape
# Runs the local build against a fake home. The shell function below only makes the
# command on screen read like the published one (npx @evalogical/keypeek).
Output docs/keypeek-demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 1200
Set Height 760
Set Padding 20
Set Theme "Dracula"
Set TypingSpeed 55ms

Hide
Type "export HOME=/tmp/keypeek-demo-home PS1='$ '" Enter
Type `npx() { shift; env -i PATH="$PATH" HOME="$HOME" node $KEYPEEK_REPO/dist/src/cli.js --path ~/work; }` Enter
Type "clear" Enter
Show

Sleep 600ms
Type "npx @evalogical/keypeek"
Sleep 400ms
Enter
Sleep 8s
