const express = require("express");
const morgan = require("morgan");
const parser = require("body-parser");
const stripe = require("stripe")("sk_test_TwTTlid3GeOG6YPydOjARw4I");
const models = require("../db/models/_model.js");
const {
  getClosestWithinRadius,
  getAdditionalPics
} = require("../helpers/yelp.js");

const bcrypt = require("bcrypt-nodejs");
const path = require("path");
const session = require("express-session");
const fileupload = require("express-fileupload");
const fs = require("fs");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const imgur = require('../../config.js')

app.use(fileupload());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const server = require("http").createServer(app);
//let server = app.listen(8810)
app.use(parser.json());
app.use(
  session({
    secret: "very secret"
  })
);
app.use(express.static(__dirname + "/../../client"));

/* ===================== */
/* Socket.io Chat Routes */
/* ===================== */

const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log(`Socket.io is listening to id: ${socket.id}`)

  socket.on('JOIN_ROOM',  (room) => {
    console.log('JOINGING ROOM', room)
    socket.join(room);

    socket.on('SEND_MESSAGE', (message) => {
      console.log(`'ROOM:' ${room} | 'MESSAGE RECEIVED: ${message}`)
      io.sockets.in(room).emit('SEND_MESSAGE', message);
    })

  });
});

app.get('/groups', (req, res) => {
  let { user_id } = req.query
  models.selectGroups(user_id, (err, response) => {
    if (err) res.sendStatus(500)
    else res.send(response)
  })
})

app.post('/groups', (req, res) => {
  models.createGroup(req.body, (err, response) => {
    if (err) res.sendStatus(500)
    else res.send(response)
  })
})

app.post('/group-invitation', (req, res) => {
  let {usersNameArray, chatgroups_id} = req.body;
  models.sendInvitation(chatgroups_id, usersNameArray, (err, response) => {
    if (err) res.sendStatus(500)
    else res.send(response)
  })
})

app.get('/group-invitation', (req, res) => {
  let { user_id } = req.query
  models.getInvitations(user_id, (err, response) => {
    if (err) res.sendStatus(500)
    else res.send(response)
  })
})

app.post('/accept-invitation', (req, res) => {
  let { id, chatgroups_id, user_id } = req.body
  models.acceptInvitation(chatgroups_id, user_id, (err, response) => {
    if (err) res.send(err)
    else res.send(response)
  })
})

app.delete('/group-invitation', (req, res) => {
  let { id, user_id } = req.query
  models.deleteInvitation(id, (err, resp) => {
    if (err) res.sendStatus(500)
    else res.send(resp)
  })
})

/* ===================== */
/* ===================== */

function auth(req, res, next) {
  if (req.session.userData) next();
  else {
    res.redirect("/");
  }
}

app.get("/logout", (req, res) => {
  delete req.session.userData;
  res.send();
});

app.get("/search", (req, res) => {
  // req.query should have [coffee, atmosphere, comfort, food, location, radius] as keys

  var params = req.query;
  var coffeeMult = 5 - params.coffee;
  var atmosphereMult = 5 - params.atmosphere;
  var comfortMult = 5 - params.comfort;
  var foodMult = 5 - params.food;
  getClosestWithinRadius(params.location, params.radius)
    .then(studySpotList => {
      models.saveSpots(studySpotList.data.businesses);
      if (coffeeMult + atmosphereMult + comfortMult + foodMult === 20) {
        res.send(studySpotList.data);
      } else {
        models.getRelevantFirst(
          studySpotList.data.businesses,
          coffeeMult,
          atmosphereMult,
          comfortMult,
          foodMult,
          (err, results) => {
            if (err) {
              console.log(err);
            }
            res.send(results);
          }
        );
      }
    })
    .catch(err => {
      console.log("Error searching for location: " + err);
    });
});

app.get("/current_user", (req, res) => {
  res.send(req.session.userData);
});

app.post("/login", (req, res) => {
  // both login and register req.query should have [username, password] as keys
  console.log('logging in as: ', req.body)
  models.login(req.body, (err, data) => {
    if (err) {
      res.status(404).send();
    } else {
      bcrypt.compare(req.body.password, data[0].password, (err, match) => {
        if (match) {
          var sess = {
            username: req.body.username,
            userId: data[0].id,
            membership: data[0].membership,
            login: true
          };

          req.session.userData = sess;
          res.send({ id: data[0].id, membership: data[0].membership });
        }
      });
    }
  });
});

app.post("/member", (req, res) => {
  req.session.userData.membership = 1;
  models.updateMembership(req.body.userId, (err, data) => {
    if (err) {
      console.error(err);
    }
    res.send(data);
  });
});

app.post("/register", (req, res) => {
  models.register(req.body, (err, data) => {
    if (err) {
      console.error("Username is taken");
    } else {
      var sess = {
        username: req.body.username,
        userId: data.insertId,
        login: true
      };

      req.session.userData = sess;
      res.send(JSON.stringify(data.insertId));
    }
  });
});

app.post("/charge", (req, res) => {
  stripe.charges.create(
    {
      amount: 2000,
      currency: "usd",
      description: "An example charge",
      source: req.body.tokenId
    },
    (err, result) => {
      if (err) res.status(500).end();
      else res.send(result);
    }
  );
});

app.post("/ratings", (req, res) => {
  // req.body should have [user_id, location_id, coffeeTea, atmosphere, comfort, food] as keys

  models.addRating(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get("/ratings", (req, res) => {
  // req.query should have location_id as a key
  // OPTIONAL: if req.query has a key, 'average', will provide average rating and rating count
  if (req.query.average) {
    models.getAveragesAndReviewCount(req.query, (err, data) => {
      if (err) {
        res.send();
      } else {
        res.send(JSON.stringify(data));
      }
    });
  } else {
    models.getRating(req.query, (err, data) => {
      if (err) {
        res.send();
      } else {
        res.send(JSON.stringify(data));
      }
    });
  }
});

app.post("/favorites", (req, res) => {
  // req.body should have user_id and location_id as keys
  models.addFavorite(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.post("/bio", (req, res) => {
  models.updateBio(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get("/bio", (req, res) => {
  console.log(req.query);
  models.getBio(req.query, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get("/favorites", (req, res) => {
  // req.query should have user_id as a key
  console.warn(req.query);
  models.getFavorite(req.query, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.post("/comments", (req, res) => {
  // req.body should have user_id, location_id, parent_id, rating_id, text as keys

  models.addComment(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get("/comments", (req, res) => {
  // req.query should have location_id as a key

  models.getComment(req.query, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get("/pics", (req, res) => {
  // req.query should have location_id as a key

  getAdditionalPics(req.query.location_id)
    .then(result => {
      res.send(result.data);
    })
    .catch(err => {
      res.send();
    });
});

app.post("/pics", (req, res) => {
  // req.body should have pics and location_id as keys

  models.addPics(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get("/reviews", (req, res) => {
  //reviews will have two props the location_id and the parent_id
  models.getFullReviews(req.query, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

//to fetch comments by parent id - for top level comments (or reviews) set parent_id to 0
app.get("/reviewsByParentId", (req, res) => {
  //takes in a parentId property
  models.getReviewByParentId(req.query, (err, data) => {
    if (err) {
      console.error(
        "there was an error fetching the reviews by parent id",
        err
      );
    } else {
      res.send(data);
    }
  });
});

//to post a sub comment to the database
app.post("/subComment", (req, res) => {
  //req body should have a parentId, location, userId, and text
  //format to match db columns will happen in model
  models.postSubComment(req.body, (err, data) => {
    if (err) {
      console.error(
        "there was an error posting this subcomment in the database",
        err
      );
    } else {
      res.sendStatus(201);
    }
  });
});
app.get("/imgProfile", (req, res) => {
  let {q} = req.query
  models.getPic(q, (e,r) => {
    if (e) console.log(e);
    else if (r[0]['profile_pic'] !== null) res.send(r[0]['profile_pic'])
    else res.send('nothing')
  })
});

app.get("/*", auth, (req, res) => {
  res.send(req.session.userData);
});

app.post("/imgProfile", (req, res) => {
  console.log(req.body);
  models.addPic(req.body, (err, data) =>{
    if (err) console.warn(err)
    else res.send('great success');
  })
});


//delete images from server
//get profile pic

app.post("/img", (req, res) => {
  let pic = req.files.image;
  let filename =
    Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, "")
      .substr(0, 6) + ".png";

  var options = {
    method: "POST",
    url: "https://api.imgur.com/3/image",
    headers: {
      "Authentication": imgur.auth,
      "Authorization": imgur.bear,
      "Cache-Control": "no-cache",
      "content-type":
      "multipart/form-data;"
    },
  };

  pic.mv(path.join("static/", filename), err => {
    if (err) res.send(500);
    else {
      // axios.post("https://api.imgur.com/3/image",{image: req.files.image}, )
      options["formData"] = {
        "name": "img",      
        "image": fs.createReadStream(path.join("static/", filename))
      }
      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        let link = JSON.parse(body);
        let url = link.data.link;
        res.send(url)
        fs.unlink(path.join("static/", filename),(err) =>{
          if (err) console.log(err);
          else console.log('all good');
        } )
      });
    }
  });
});

const port = 80;

let hi = server.listen(port, () => {
  console.log("App is listening to port", port);
});

exports.app = app;
