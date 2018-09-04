import React from "react";
import {
  Navbar,
  NavItem,
  Nav,
  NavDropdown,
  MenuItem,
  Button,
  FormGroup,
  FormControl,
  Modal
} from "react-bootstrap";


import Favorites from "./Favorites.jsx";
import Upload from "./Upload.jsx";
import axios from "axios";

class Profile extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showProfile: false, //keep false by default
      bio: null,
      toggleForm: false,
      userInput: "",
      profilePic: null,
      showButton: false,
    };

    this.toggleProfile = this.toggleProfile.bind(this);
    this.getBio = this.getBio.bind(this);
    this.getPic = this.getPic.bind(this);
    this.renderBio = this.renderBio.bind(this);
    this.sendBio = this.sendBio.bind(this);
    this.toggleForm = this.toggleForm.bind(this);
    this.toggleButton = this.toggleButton.bind(this);
    this.getBio();
  }

  toggleProfile() {
    this.setState({
      showProfile: !this.state.showProfile
    });
  }

  getBio() {
    axios
      .get(`/bio?user_id=${this.props.userId}`)
      .then(({ data }) => this.setState({ bio: data[0].bio === null ? 'Add a bio!' : data[0].bio}));
    this.getPic();
  }
  getPic() {
    axios
      .get(`/imgProfile?q=${this.props.userId}`)
      .then(({data}) =>  this.setState({ profilePic: data === 'nothing' ? 'https://pbs.twimg.com/profile_images/702479650237366272/HyN65Fu7_400x400.jpg' : data}));

  }
  toggleButton(){
    this.setState({showButton: !this.state.showButton})
  }

  sendBio() {
    axios
      .post(`/bio`, {
        user_id: this.props.userId,
        bio: this.state.userInput
      })
      .then(() => this.setState({ bio: this.state.userInput }));
  }
  toggleForm() {
    this.setState({ toggleForm: !this.state.toggleForm });
  }

  renderBio() {
    if (this.state.toggleForm) {
      return (
        <form
          onSubmit={e => {
            e.preventDefault();
            console.log(this.state.userInput);
            this.sendBio();
            this.setState({ bio: this.state.userInput });
            this.toggleForm();
          }}
        >
          <textarea
            maxLength="280"
            value={this.state.userInput}
            onChange={e => this.setState({ userInput: e.target.value })}
          />
          <br />
          <input
            onSubmit={e => {
              e.preventDefault();
              this.sendBio();
              this.toggleForm();
            }}
            type="submit"
          />
        </form>
      );
  } else {
      return (
        <div>
          <a
            className="emoji"
            onClick={this.toggleForm}
          >
            🖋️
          </a>

          <p>{this.state.bio}</p>
        </div>
      );
    } 
  }

  componentWillUpdate() {
    if (this.props.userId && this.state.bio === null) this.getBio();
  }

  render() {
    return (
      <div>
        <Modal show={this.props.showProfile} onHide={this.props.toggleProfile}>
          <Modal.Body className="upper">
            {/* make this container a css grid */}
            <div className="picture" 
                onMouseEnter={this.toggleButton}
                onMouseLeave={this.toggleButton}>
              <img
                className="img-responsive thumbnail"
                src={this.state.profilePic}
              />
              { 
                this.state.showButton ? (              <Upload userId={this.props.userId} trigger={this.getPic}/>
                ): null}
            </div>

            <div className="rightSide">
              <div className="title">
                <h1>{this.props.user}</h1>
              </div>
              <div className="bio">
                    {this.renderBio()}
              </div>
            </div>

            <div className="down">
              <Favorites
                userId={this.props.userId}
                showFavorites={this.state.showProfile}
                closeFavorites={this.toggleProfile}
              />
            </div>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

export default Profile;
