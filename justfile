default:
	just --list

setup:
	podman build -t bitburner-typescript .

run:
	podman run --rm -d -v "$(pwd)/src:/app/src" -v "$(pwd)/NetscriptDefinitions.d.ts:/app/NetscriptDefinitions.d.ts" -p 12525:12525 --name bitburner-filesync bitburner-typescript
