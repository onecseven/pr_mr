import axios from "axios";
import React from "react";

class HeartButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loggedIn: false,
      isAlreadyFave: false
    };
    // are we logged in?
    if (this.props.user_id) {
      this.state.loggedIn = true;
    }
    this.checkFaved = this.checkFaved.bind(this);
    this.addToFave = this.addToFave.bind(this)
  }

  componentWillReceiveProps() {
    if (this.props.favorites) {
      let faves = this.props.favorites.map(elem => elem.id)
      if (faves.includes(this.props.location_id)) {
        this.setState({isAlreadyFave: true})
      }
    }
  }
  checkFaved() {
    axios.get(`/favorites?q=${this.props.user_id}`).then(e => console.warn(e));
  }
  
  addToFave() {
    axios
      .post('/favorites', {
        user_id: this.props.user_id,
        location_id: this.props.location_id
      })
      .then((response) => {
        this.setState({isAlreadyFave: !this.state.isAlreadyFave})
      });
  }

  render() {
    return (
      <a
        className={this.state.isAlreadyFave ? "active" : "emoji"}
        onClick={this.addToFave}
      >
        ❤️
      </a>
    );
  }
}

// ({ user_id, location_id }) {
//   let post = () => {
//     if (!user_id || !location_id) return;
//     axios
//       .post("/favorites", {
//         user_id: user_id,
//         location_id: location_id
//       })
//       .then(e => console.log("this happened")
//       .then(e => pressed = !pressed));
//   };
//   var pressed = false;

// }

export default HeartButton;
