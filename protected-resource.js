const express = require("express")
const bodyParser = require("body-parser")
const fs = require("fs")
const { timeout } = require("./utils")
const { JsonWebTokenError } = require("jsonwebtoken")
const jwt = require("jsonwebtoken");

const config = {
	port: 9002,
	publicKey: fs.readFileSync("assets/public_key.pem"),
}

const users = {
	user1: {
		username: "user1",
		name: "User 1",
		date_of_birth: "7th October 1990",
		weight: 57,
	},
	john: {
		username: "john",
		name: "John Appleseed",
		date_of_birth: "12th September 1998",
		weight: 87,
	},
}

const app = express()
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


// Returns prtotected information about the user for authorized clients
app.get('/user-info', (req, res) => {
	const response = {}; // JSON response object
	
	// Check existence of the access token 
	if (!req.headers.authorization) {
		return res.status(401).end();
	}

	// Extract access token
	const bearerStrLength = "bearer".length;
	authToken = req.headers.authorization.slice(bearerStrLength + 1);
	
	/* 
	Check if the access token is valid
	The 'jwt' library throws error if, for example, access token is expired */
	try {
		decodedObject = jwt.verify(authToken, config.publicKey, {
			algorithm: 'RS256'
		});
	}
	catch {
		return res.status(401).end();
	}

	const {
		userName,
		scope
	} = decodedObject;
	const scopes = scope.split(' ');
	
	// Extract each requested info
	scopes.forEach(ele => {
		let requestedUserInfo = ele.slice("permission:".length);
		response[requestedUserInfo] = users[userName][requestedUserInfo];
	});

	return res.json(response);
});


const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address
	var port = server.address().port
})

// for testing purposes
module.exports = {
	app,
	server,
}
