const express = require('express');
const parser = require('body-parser');
const {
  getClosestWithinRadius,
  getAdditionalPics
} = require('../helpers/yelp.js');
const models = require('../db/models/_model.js');

const bcrypt = require('bcrypt-nodejs');
const session = require('express-session');

const app = express();
const server = require('http').createServer(app);

app.use(express.static(__dirname + '/../../client'));
app.use(parser.json());
app.use(
  session({
    secret: 'very secret'
  })
);


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
  let { user_id } = req.params
  console.log(user_id)
  // TODO: Create and use model to fetch groups by user_id 
})

app.post('/groups', (req, res) => {
  let { user_id,  group_name,  group_thumbnail, group_topic } = req.params

  console.log(user_id)
  // TODO: Create and use model to create groups by user_id 
})

app.delete('/groups', (req, res) => {
  let { group_name } = req.params
  console.log(group_name)
  // TODO: Create and use model to delete groups by user_id 
})


/* ===================== */
/* ===================== */



function auth(req, res, next) {
  if (req.session.userData) next();
  else {
    res.redirect('/');
  }
}

app.get('/logout', (req, res) => {
  delete req.session.userData;
  res.send();
});

app.get('/search', (req, res) => {
  // req.query should have [coffee, atmosphere, comfort, food, location, radius] as keys

  var params = req.query;
  var coffeeMult = 5 - params.coffee;
  var atmosphereMult = 5 - params.atmosphere;
  var comfortMult = 5 - params.comfort;
  var foodMult = 5 - params.food;
  getClosestWithinRadius(params.location, params.radius)
    .then((studySpotList) => {
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
    .catch((err) => {
      console.log('Error searching for location: ' + err);
    });
});

app.post('/login', (req, res) => {
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
            login: true
          };

          req.session.userData = sess;
          res.send(JSON.stringify(data[0].id));
        }
      });
    }
  });
});

app.post('/register', (req, res) => {
  models.register(req.body, (err, data) => {
    if (err) {
      console.error('Username is taken');
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

app.post('/ratings', (req, res) => {
  // req.body should have [user_id, location_id, coffeeTea, atmosphere, comfort, food] as keys

  models.addRating(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get('/ratings', (req, res) => {
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

app.post('/favorites', (req, res) => {
  // req.body should have user_id and location_id as keys

  models.addFavorite(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get('/favorites', (req, res) => {
  // req.query should have user_id as a key

  models.getFavorite(req.query, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.post('/comments', (req, res) => {
  // req.body should have user_id, location_id, parent_id, text as keys

  models.addComment(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get('/comments', (req, res) => {
  // req.query should have location_id as a key

  models.getComment(req.query, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get('/pics', (req, res) => {
  // req.query should have location_id as a key

  getAdditionalPics(req.query.location_id)
    .then((result) => {
      res.send(result.data);
    })
    .catch((err) => {
      res.send();
    });
});

app.post('/pics', (req, res) => {
  // req.body should have pics and location_id as keys

  models.addPics(req.body, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get('/reviews', (req, res) => {
  //reviews will have two props the location_id and the parent_id
  models.getFullReviews(req.query, (err, data) => {
    if (err) {
      res.send();
    } else {
      res.send(JSON.stringify(data));
    }
  });
});

app.get('/reviewsByParentId', (req, res) => {
  //takes in a parentId property 
  models.getReviewByParentId(req.query, (err, data) => {
    if (err) {
      console.error('there was an error fetching the reviews by parent id', err)
    } else {
      console.log('the data in the server')
      res.send(data);
    }
  })
})

app.get('/*', auth, (req, res) => {
  res.send(req.session.userData);
});

const port = 8080;

server.listen(port, () => {
  console.log('App is listening to port', port);
});
