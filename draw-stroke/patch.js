function patch(json) {
	try {
		return JSON.parse(json);
	} catch (e) {
	}

	var token = [];
	for(var i = 0; i < json.length; ++i) {
		var c = json.charAt(i);
		if(c == '{' || (c == '"' && token[token.length-1] != '"') || c == '[') {
			token.push(c);
		} else if(c == '}' || c == '"' || c == ']') {
			if(token[token.length-1] == ':') {
				token.pop();
			}
			token.pop();
		}
	}
	if(json.charAt(json.length-1) == ':') {
		json += '""';
	}
	for(var i = token.length - 1; i >= 0; --i) {
		var c = token[i];
		if(c == '{') {
			json += '}';
		} else if(c == '"') {
			json += '"';
		} else if(c == '[') {
			json += ']';
		}
	}
	console.log(json);
	return JSON.parse(json);
}
