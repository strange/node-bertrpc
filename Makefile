NODE = env NODE_PATH=src node

test: .PHONY
	ls -1 test/*-test.js | xargs $(NODE)

.PHONY:
