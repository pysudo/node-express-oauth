const express = require("express")
const bodyParser = require("body-parser")
const axios = require("axios").default
const { randomString, timeout } = require("./utils")
const { response } = require("express")

const config = {
	port: 9000,

	clientId: "my-client",
	clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
	redirectUri: "http://localhost:9000/callback",

	authorizationEndpoint: "http://localhost:9001/authorize",
	tokenEndpoint: "http://localhost:9001/token",
	userInfoEndpoint: "http://localhost:9002/user-info",
}
let state = ""

const app = express()
app.set("view engine", "ejs")
app.set("views", "assets/client")
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/*
Your code here
*/
app.get('/authorize', (req, res) => {

	/* 'state' keeps track of the authorization request and verifies the same when it 
	is sent back from the authorization server */
	state = randomString();
	queryParams = {
		response_type: "code",
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		scope: "permission:name permission:date_of_birth",
		state
	};
	redirectURL = new URL(config.authorizationEndpoint);
	redirectURL.search = new URLSearchParams(queryParams);

	return res.redirect(redirectURL.href);
});

app.get('/callback', (req, res) => {
	let accessToken = "";
	let userData = {};
	const isValidState = req.query.state;
	const authorizationCode = req.query.code;

	// Verify the state from the authorization server
	if (!(isValidState === state)) {
		// If invalid state, 403 forbidden
		return res.status(403).end();
	}

	// Back-channel request to the auth server using auth token/grant
	axios({
		method: "POST",
		url: config.tokenEndpoint,
		auth: {
			username: config.clientId,
			password: config.clientSecret
		},
		data: {
			code: authorizationCode // Authorization grant
		},
	}).then(response => {
		accessToken = response.data.access_token; // Access Token
		
		// Use returned token to access user's scoped information  
		axios({
			method: "GET",
			url: config.userInfoEndpoint,
			headers: {
				authorization: `bearer ${accessToken}`,
			},
		}).then(response => {
			// Render a welcome page using the requested user data
			userData = response.data;
			
			return res.render('welcome', { user: userData });
		})
	});



});

const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address
	var port = server.address().port
})

// for testing purposes

module.exports = {
	app,
	server,
	getState() {
		return state
	},
	setState(s) {
		state = s
	},
}
