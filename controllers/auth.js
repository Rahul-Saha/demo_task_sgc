const { compareHash, getHashedText, generateSalt } = require('../services/crypto.service');
const { sendResponse, getUniqueId, generateUserId } = require('../lib/utils');
const Messages = require('../constants/messages');
const db = require('../services/db.service');
const { ACCESS_TOKEN_VALIDITY, REFRESH_TOKEN_VALIDITY } = require('../constants/tokens');
const { getAccessToken, getRefreshToken } = require('../services/jwt.service');

const register = async (req, res) => {
	try {
    const { email, password } = req.body;
    
		if (!email || !password) {
			return sendResponse(res, 400, false, Messages.MANDATORY_INPUTS_REQUIRED);
    }

    // Check if the username already exists in the database
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkUserQuery, [email], (err, results) => {
      if (err) {
        return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
      }

      if (results.length > 0) {
        // A user with the same email already exists
        return sendResponse(res, 409, false, Messages.USER_ALREADY_REGISTERED);
      }
    

      const salt = generateSalt();
      const encrytedPassword = getHashedText(password, salt);

      const query = 'INSERT INTO users (userId, email, password) VALUES (?, ?, ?)';
      db.query(query, [getUniqueId(), email, encrytedPassword], (err, result) => {
        if (err) {
          return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
        }
        return sendResponse(res, 201, true, Messages.USER_REGISTRATION_SUCCESS);
      });
    });
	} catch (err) {
		console.log(err);
		return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
	}
};

const login = async (req, res) => {

	try {
    let user;
    const { email, password } = req.body;

		if (!email || !password) {
			return sendResponse(res, 400, false, Messages.MANDATORY_INPUTS_REQUIRED);
    }

    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkUserQuery, [email], (err, results) => {
      if (err) {
        return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
      }

      if (!results.length) {
        return sendResponse(res, 409, false, Messages.USER_NOT_FOUND);
      }
      user = results[0];
  
      if (!compareHash(password, user.password)) {
        return sendResponse(res, 401, false, Messages.INCORRECT_PASSWORD);
      }
  
      let payload = {
        userId: user.userId,
        email: user.email,
      }
  
      const accessToken = getAccessToken(payload, ACCESS_TOKEN_VALIDITY);
  
      const refreshToken = getRefreshToken(payload, REFRESH_TOKEN_VALIDITY);
  
      if (!accessToken || !refreshToken) {
        return sendResponse(res, 500, false, Messages.TOKEN_GENERATION_ERROR);
      }
  
      return sendResponse(res, 200, true, Messages.USER_AUTHENTICATION_SUCCESS, { accessToken, refreshToken });
    });

	} catch (err) {
		console.log(err);
		return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);

	}
};

const getUserProfile = async (req, res) => {
	try {
    const email = req.query.email;
    const getUserQuery = `
    SELECT users.id, users.userId, users.email, users.name, users.aboutArtist, users.shopBanner, users.aboutStore,
           academics.id as academicsId, academics.degreeName, academics.year,
           exhibitions.id AS exhibitionId, exhibitions.exhibitionName, exhibitions.year AS exhibitionYear
    FROM users
    LEFT JOIN academics ON users.userId = academics.userId
    LEFT JOIN exhibitions ON users.userId = exhibitions.userId
    WHERE users.email = ?`;

    db.query(getUserQuery, [email], (err, results) => {
      if (err) {
        console.error('Database error:', err);
		    return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
      }
  
      if (results.length === 0) {
		    return sendResponse(res, 404, false, Messages.USER_NOT_FOUND);
      }
  
      // Group academic details and exhibitions by userId
      const userData = {
        id: results[0].id,
        userId: results[0].userId,
        email: results[0].email,
        name: results[0].name,
        aboutArtist: results[0].aboutArtist,
        shopBanner: results[0].shopBanner,
        aboutStore: results[0].aboutStore,
        academicDetails: [],
        exhibitions: []
      };

      const uniqueExhibitions = new Set(); 
      const uniqueAcademicDetails = new Set(); 
      results.forEach(row => {
        if (row.degreeName && row.year) {
          const academicDetail = {
            id: row.academicsId,
            userId: row.userId,
            degreeName: row.degreeName,
            year: row.year
          };
          const academicDetailKey = row.academicsId;
          if (!uniqueAcademicDetails.has(academicDetailKey)) {
            uniqueAcademicDetails.add(academicDetailKey);
            userData.academicDetails.push(academicDetail);
          }
        }

        if (row.exhibitionName && row.exhibitionYear) {
          const exhibitions = {
            id: row.exhibitionId,
            userId: row.userId,
            exhibitionName: row.exhibitionName,
            year: row.exhibitionYear
          }
          const exhibitionKey = row.exhibitionId;
          console.log(row.exhibitionId)
          console.log(uniqueExhibitions.has(exhibitionKey))
          if (!uniqueExhibitions.has(exhibitionKey)) {
            uniqueExhibitions.add(exhibitionKey);
            userData.exhibitions.push(exhibitions);
          }
        }
      });
  
      return sendResponse(res, 200, true, Messages.USER_PROFILE_FETCHED, userData);
    });

	} catch (err) {
		console.log(err);
		return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
	}
};

const updateUserProfile = async (req, res) => {
  console.log('updateUserProfile checked');
  try {
    const userData = req.body;

    // Extract academicDetails and exhibitions from userData
    const { academicDetails, exhibitions, ...userDetails } = userData;
    const updateUserQuery = `
      INSERT INTO users (id, userId, email, name, aboutArtist, shopBanner, aboutStore)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      email = VALUES(email),
      name = VALUES(name),
      aboutArtist = VALUES(aboutArtist),
      shopBanner = VALUES(shopBanner),
      aboutStore = VALUES(aboutStore)
    `;

    db.query(
      updateUserQuery,
      [
        userDetails.id,
        userDetails.userId,
        userDetails.email,
        userDetails.name,
        userDetails.aboutArtist,
        userDetails.shopBanner,
        userDetails.aboutStore
      ],
      (err, result) => {
        if (err) {
          console.error('User data insertion/updation failed:', err);
          return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
        }
  
        // Save or update academic details in the 'academics' table
        academicDetails.forEach(academicDetail => {
          const saveOrUpdateAcademicQuery = `
            INSERT INTO academics (id, userId, degreeName, year)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            degreeName = VALUES(degreeName),
            year = VALUES(year)
          `;
  
          db.query(
            saveOrUpdateAcademicQuery,
            [
              academicDetail.id,
              userDetails.userId,
              academicDetail.degreeName,
              academicDetail.year
            ],
            err => {
              if (err) {
                console.error('Academic data insertion/updation failed:', err);
                return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
              }
            }
          );
        });
  
        // Save or update exhibition details in the 'exhibitions' table
        exhibitions.forEach(exhibition => {
          const saveOrUpdateExhibitionQuery = `
            INSERT INTO exhibitions (id, userId, exhibitionName, year)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            exhibitionName = VALUES(exhibitionName),
            year = VALUES(year)
          `;
  
          db.query(
            saveOrUpdateExhibitionQuery,
            [
              exhibition.id,
              userDetails.userId,
              exhibition.exhibitionName,
              exhibition.year
            ],
            err => {
              if (err) {
                console.error('Exhibition data insertion/updation failed:', err);
                return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
              }
            }
          );
        });
  
      return sendResponse(res, 200, true, Messages.USER_PROFILE_FETCHED, userData);
    });
  } catch (err) {
    console.log(err);
    return sendResponse(res, 500, false, Messages.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
	register,
	login,
  getUserProfile,
  updateUserProfile
};