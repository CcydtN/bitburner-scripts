default:
	just --list

setup:
	docker build -t bitburner-typescript .

run:
	docker run --rm -d -v "$($pwd)/src:/app/src" -v "$($pwd)/NetscriptDefinitions.d.ts:/app/NetscriptDefinitions.d.ts" -p 12525:12525 --name bitburner-filesync bitburner-typescript


