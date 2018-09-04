const axios = require('axios');
const config = require('../../config.js')

let options = {
  headers: {
    Authorization: `Bearer ${config.YELPAPI}`
  }
};

let getClosestWithinRadius = (loc, radius) => {
  // See https://www.yelp.com/developers/documentation/v3/business_search for more info
  options.params = {
    term: 'study spots',
    radius: radius,
    location: loc,
    sort_by: 'distance'
  };

  return axios
    .get(`https://api.yelp.com/v3/businesses/search`, options)
    .catch((err) => {
      console.log(err);
    });
};

let getAdditionalPics = (locId) => {
  // See https://www.yelp.com/developers/documentation/v3/business for more info
  return axios
    .get(`https://api.yelp.com/v3/businesses/${locId}`, options)
    .catch((err) => {
      console.log({
        err
      });
    });
};

module.exports.getClosestWithinRadius = getClosestWithinRadius;
module.exports.getAdditionalPics = getAdditionalPics;
