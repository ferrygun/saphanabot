/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, newcap:0*/
/*eslint-env node, es6 */
"use strict";
var express = require("express");
var async = require("async");
var bodyParser = require("body-parser");
var client = require("@sap/hana-client");
var xsenv = require("@sap/xsenv");
var hdbext = require('@sap/hdbext');

var hanaOptions = xsenv.getServices({
	hana: {
		tag: "hana"
	}
});

var hanaConfig = {
	host: hanaOptions.hana.host,
	port: hanaOptions.hana.port,
	user: hanaOptions.hana.user,
	password: hanaOptions.hana.password,
	CURRENTSCHEMA: hanaOptions.hana.schema
};

function sendTextReply(res, msg) {
	res.send({
		replies: [{
			type: 'text',
			content: msg
		}],
		conversation: {
			memory: {
				key: "Null"
			}
		}
	});
}

function sendCardsReply(res, card_title, card_sub_title, image_url, button_title, button_type, button_value, memkey) {
	res.send({
		replies: [{
			type: "card",
			content: {
				title: card_title,
				subtitle: card_sub_title,
				imageUrl: image_url,
				buttons: [{
					title: button_title,
					type: button_type,
					value: button_value
				}]
			}
		}],
		conversation: {
			memory: {
				key: memkey
			}
		}
	});
}

function sendQuickReply(res, msg, memkey) {
	res.send({
		replies: [{
			type: "quickReplies",
			content: {
				title: msg,
				buttons: [{
					title: "Yes",
					value: "Yes"
				}, {
					title: "No",
					value: "No"
				}]
			}
		}],
		conversation: {
			memory: {
				key: memkey
			}
		}
	});
}

function sendButtonReply(res, msg, title, linkvalue) {
	res.send({
		replies: [{
			type: 'buttons',
			content: {
				title: msg,
				buttons: [{
					title: title,
					type: "web_url",
					value: linkvalue
				}]
			}
		}],
		conversation: {
			memory: {
				key: "Null"
			}
		}
	});
}

module.exports = function () {
	var app = express.Router();

	app.use(bodyParser.json());

	app.post('/node', async(req, res) => {

		var slug = req.body.nlp.intents[0].slug;
		console.log("slug: " + slug);
		var entities = req.body.nlp.entities;

		if (slug === "query-email-address") {
			if (entities.hasOwnProperty("emailaddr") && entities.hasOwnProperty("company")) {
				var org = entities.company[0].raw;
				console.log(org);

				var dbClass = require(global.__base + "utils/dbPromises");
				var client = await dbClass.createConnection();
				var db = new dbClass(client);

				try {
					var statement = await db.preparePromisified(
						`SELECT EMAILADDRESS FROM ZCHATBOT WHERE COMPANY = ?`);

					var dataResults = await db.statementExecPromisified(statement, [org]);
					if (dataResults.length > 0) {
						console.log(dataResults[0].EMAILADDRESS);
						sendTextReply(res, "Email address is " + dataResults[0].EMAILADDRESS)
					} else {
						sendTextReply(res, "There is no email address for " + org);
					}
				} catch (e) {
					console.log(e);
					sendTextReply(res, "There is an error occured");
				}
			}
		}

		if (slug === "write-email-address") {
			if (entities.hasOwnProperty("emailaddr") && entities.hasOwnProperty("company") && entities.hasOwnProperty("email")) {
				var org = entities.company[0].raw;
				var emailaddress = entities.email[0].raw;

				var dbClass = require(global.__base + "utils/dbPromises");
				var client = await dbClass.createConnection();
				var db = new dbClass(client);

				try {
					var statement = await db.preparePromisified(
						`SELECT EMAILADDRESS FROM ZCHATBOT WHERE COMPANY = ?`);

					var dataResults = await db.statementExecPromisified(statement, [org]);
					if (dataResults.length > 0) {

						var inputParams = {
							COMP: org,
							EMAILADD: emailaddress
						};

						hdbext.createConnection(hanaConfig, function (error, client) {
							if (error) {
								console.error(error);
							}

							hdbext.loadProcedure(client, null, "updateData", function (err, sp) {
								sp(inputParams, (err, parameters, results) => {
									if (err) {
										console.log(err);
									}
									sendTextReply(res, "Email address has been updated to " + emailaddress)
								});
							});
						});

					} else {

						var statement = await db.preparePromisified(
							`SELECT \"zchatbotSeqId\".NEXTVAL AS ID
							 FROM DUMMY`);
						var dataResults = await db.statementExecPromisified(statement, []);

						var ID = dataResults[0].ID;
						var COMPANY = org;
						var COMPANYCODE = "01";
						var EMAILADDRESS = emailaddress;
						var inputParams = {
							ID: ID,
							COMPANY: COMPANY,
							COMPANYCODE: COMPANYCODE,
							EMAILADDRESS: EMAILADDRESS
						};

						hdbext.createConnection(hanaConfig, function (error, client) {
							if (error) {
								console.error(error);
							}

							hdbext.loadProcedure(client, null, "insertData", function (err, sp) {
								sp(inputParams, (err, parameters, results) => {
									if (err) {
										console.log(err);
									}
									sendTextReply(res, "Email address has been updated to " + emailaddress)
								});
							});
						});
					}
				} catch (e) {
					console.log(e);
					sendTextReply(res, "There is an error occured");
				}

				/*
				var ID = 0;
				var COMPANY = "ABC";
				var COMPANYCODE = "01";
				var EMAILADDRESS = "ABC@company.com";
				var inputParams = {
					ID: ID,
					COMPANY: COMPANY,
					COMPANYCODE: COMPANYCODE,
					EMAILADDRESS: EMAILADDRESS
				};

				let client = require("@sap/hana-client");
				//Lookup HANA DB Connection from Bound HDB Container Service
				const xsenv = require("@sap/xsenv");
				let hanaOptions = xsenv.getServices({
					hana: {
						tag: "hana"
					}
				});

				var hanaConfig = {
					host: hanaOptions.hana.host,
					port: hanaOptions.hana.port,
					user: hanaOptions.hana.user,
					password: hanaOptions.hana.password,
					CURRENTSCHEMA: hanaOptions.hana.schema
				};

				var hdbext = require('@sap/hdbext');
				hdbext.createConnection(hanaConfig, function (error, client) {
					if (error) {
						console.error(error);
					}

					hdbext.loadProcedure(client, null, "insertData", function (err, sp) {
						sp(inputParams, (err, parameters, results) => {
							if (err) {
								console.log("errB: " + err);
							}
						});
					});
				});
				*/
			}
		}
	});

	app.get("/getSessionInfo", (req, res) => {
		let client = require("@sap/hana-client");
		//Lookup HANA DB Connection from Bound HDB Container Service
		const xsenv = require("@sap/xsenv");
		let hanaOptions = xsenv.getServices({
			hana: {
				tag: "hana"
			}
		});
		res.type("application/json").status(200).send(hanaOptions);
	});

	return app;
};