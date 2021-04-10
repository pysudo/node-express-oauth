const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const {
	randomString,
	containsAll,
	decodeAuthCredentials,
	timeout,
} = require("./utils");


const config = {
	port: 9001,
	privateKey: fs.readFileSync("assets/private_key.pem"),

	clientId: "my-client",
	clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
	redirectUri: "http://localhost:9000/callback",

	authorizationEndpoint: "http://localhost:9001/authorize",
};

const clients = {
	"my-client": {
		name: "Sample Client",
		clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
		scopes: ["permission:name", "permission:date_of_birth"],
	},
	"test-client": {
		name: "Test Client",
		clientSecret: "TestSecret",
		scopes: ["permission:name"],
	},
};

const users = {
	user1: "password1",
	john: "appleseed",
};

const requests = {};
const authorizationCodes = {};

let state = "";

const app = express();
app.set("view engine", "ejs");
app.set("views", "assets/authorization-server");
app.use(timeout);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/*
Your code here
*/
app.get('/authorize', (req, res) => {

	const { client_id, scope } = req.query;

	const isValidClient = clients.hasOwnProperty(client_id);
	if (!(client_id && isValidClient)) {
		return res.status(401).end();
	}


	const scopes = scope.split(" ");
	const isValidScope = containsAll(clients[client_id].scopes, scopes);
	if (!(isValidScope)) {
		return res.status(401).end();
	}

	const requestId = randomString();
	requests[requestId] = req.query;

	// Authentication server requires verification via Authentication
	return res.status(200).render('login', {
		client: clients[client_id],
		scope: req.query.scope,
		requestId: requestId
	});
});

app.post('/approve', (req, res) => {
	// Authenticate the user
	const { userName, password, requestId } = req.body;
	const isValidUser = users.hasOwnProperty(userName);
	if (!(isValidUser && (users[userName] === password))) {
		return res.status(401).end();
	}
	if (!(requests[requestId])) {
		return res.status(401).end();
	}

	// Check if the request is valid
	const clientReq = requests[requestId];
	delete requests[requestId];
	
	// Generate authorization grant
	const authorizationCode = randomString();
	authorizationCodes[authorizationCode] = {
		clientReq,
		userName
	};

	/* User is redirected to redirect URI after successful authorization along 
	with authorization grant */
	const redirectURI = new URL(clientReq.redirect_uri);
	redirectURI.searchParams.append('code', authorizationCode);
	redirectURI.searchParams.append('state', clientReq.state);

	return res.status(302).redirect(redirectURI);
});

app.post('/token', (req, res) => {
	// Back-channel request to the auth server using auth token/grant
	if (!req.headers.authorization) {
		return res.status(401).end();
	}

	// Credentials for client to authenticate itself as a user
	const {
		clientId,
		clientSecret
	} = decodeAuthCredentials(req.headers.authorization);

	if (!clients.hasOwnProperty(clientId)) {
		return res.status(401).end();
	}
	if (!(clients[clientId].clientSecret === clientSecret)) {
		return res.status(401).end();
	}

	// Checks the authorization grant is valid
	if (!authorizationCodes.hasOwnProperty(req.body.code)) {
		return res.status(401).end();
	}
	const authValue = authorizationCodes[req.body.code];
	delete authorizationCodes[req.body.code];

	// Generate access token and send it as a response to the client
	const payload = {userName: authValue.userName, scope: authValue.clientReq.scope};
	const jwtStr = jwt.sign(payload, config.privateKey, { algorithm: 'RS256'});

	return res.status(200).json({"access_token": jwtStr, "token_type": "Bearer"});
})

const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address;
	var port = server.address().port;
});

// for testing purposes

module.exports = { app, requests, authorizationCodes, server };
