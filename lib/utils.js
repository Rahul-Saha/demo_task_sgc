
const { v4: uuidv4 } = require('uuid');

const sendResponse = (res, statusCode, success, message, data) => {
	res.status(statusCode).json({ success, message, ...data && { data } });
}

const getUniqueId = () => uuidv4();


const generateUserId = () => {

	let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let randomString = "";

	for (var i = 0; i < 4; i++) {
		var randomNumber = Math.floor(Math.random() * chars.length);
		randomString += chars.substring(randomNumber, randomNumber + 1);
	}
	return randomString + generateRandomNumber().toString()
}

const generateRandomNumber = (length = 4) => {
	const digits = "0123456789";
	let randomNumber = '';

	for (let i = 0; i < 4; i++) {
		randomNumber += digits[Math.floor(Math.random() * 10)];
	}

	return randomNumber;
}

module.exports = {
	sendResponse,
  getUniqueId,
  generateUserId,
  generateRandomNumber
}