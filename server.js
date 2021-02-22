const express = require("express");
const env = require("dotenv");
const axios = require("axios");
const app = express();
const cors = require("cors");
const querystring = require("querystring");
const jwt = require("jsonwebtoken");

env.config();
app.use(cors());

function getGoogleAuthURL() {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: `${process.env.SERVER_ROOT_URL}/auth/google`,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    prompt: "consent",
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  return `${rootUrl}?${querystring.stringify(options)}`;
}

app.get("/auth/google/url", (req, res) => {
  return res.send(getGoogleAuthURL());
});

app.get("/", (req, res) => {
  return res.send("hi");
});
function getTokens(code, clientId, clientSecret, redirectUri) {
  const url = "https://oauth2.googleapis.com/token";
  const values = {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  };
  return axios
    .post(url, querystring.stringify(values), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    .then((res) => res.data)
    .catch((error) => {
      console.error(`Failed to fetch auth tokens`);
      throw new Error(error.message);
    });
}

app.get("/auth/google", async (req, res) => {
  const code = req.query.code;
  const { id_token, access_token } = await getTokens(
    code,
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SERVER_ROOT_URL}/auth/google`
  );
  // googleUser get data user
  const googleUser = await axios
    .get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    )
    .then((res) => res.data)
    .catch((error) => {
      console.error(`Failed to fetch user`);
      throw new Error(error.message);
    });

  const token = jwt.sign(googleUser, process.env.JWT_SECRET);

  res.cookie(process.env.COKKIE_NAME, token, {
    maxAge: 900000,
    httpOnly: true,
    secure: false,
  });
  /// get jwt
  console.log(googleUser);
  res.send(googleUser);
  //   res.redirect(process.env.UI_ROOT_URL);
});

app.get("/here", (req, res) => {
  return res.send("token here");
});
app.listen(process.env.PORT, () => {
  console.log("server on port", process.env.PORT);
});
