import React from 'react';
import io from 'socket.io-client';
import '../chat.css';


class Chat extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      groupMessages: [],
      textMessage: ''
    }
    this.socket = io.connect('http://18.218.149.150:8810');
    this.socket.emit('JOIN_ROOM', this.props.selectedRoom['group_name']) // TODO: Change to select first room in chat array 
    this.socket.on('SEND_MESSAGE', (data) => this.receiveMessages(data))

    this.handleChange = this.handleChange.bind(this);
    this.receiveMessages = this.receiveMessages.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }
 

  handleChange(e) {
    this.setState({textMessage: e.target.value})
  }

  receiveMessages(messages) {
    this.setState({groupMessages: [...this.state.groupMessages, messages]})
  }

  // TODO: Change room to be the first room in the chat array 
  sendMessage(e) {
    e.preventDefault();
    let message = {room: this.props.selectedRoom['group_name'], userId: this.props.userId, username: this.props.username, textMessage: this.state.textMessage}
    console.log('Sending message: ', message)
    this.socket.emit('SEND_MESSAGE', message)  
    this.setState({textMessage: ''})
  }

  render() {
    return (  
    <div className="chat">  
      <div className="panel panel-default">
        <div className="panel-heading"><strong>{this.props.selectedRoom['group_topic']} Stud(y) Group</strong></div>

        {/* MESSAGES */}

        <div className="chat-body">
          <div className="panel-body">
            {
                  this.state.groupMessages.map((message, i) => {
                    return (
                      this.props.username === message.username ? (
                        <div key={i} className="chat-friend">
                          <div><strong style={{color: "6495ED"}}>Me:</strong>  {message.textMessage}</div>
                        </div>
                      ) : (
                        <div key={i} className="chat-friend">
                          <div><strong style={{color: "008080"}}>{message.username}:</strong>  {message.textMessage}</div>
                        </div>
                      )   
                    )                  
                })
            }
          </div>
        </div>

        {/* MESSAGE FORM */}

        <div className="input-group">
          <input type="text" 
            value={this.state.textMessage} 
            onChange={this.handleChange} 
            className="form-control" 
            placeholder="Message..."
            />
          <span className="input-group-btn">
            <button className="btn btn-default" type="button" onClick={(e) => {this.sendMessage(e)}}>Send</button>
          </span>
        </div>
      </div>    
  </div> 
    )
  }
}

export default Chat;

/* FOR GLOBAL CHAT */ 

// IN SERVER
 /* Global Chat Message
  socket.on('SEND_MESSAGE', (message) => {
    console.log('MESSAGE RECEIVED: ', message)
    io.emit('SEND_MESSAGE', message)
   })*/

// IN CONSTRUCTOR: 
 /*  this.socket.on('SEND_MESSAGE', (data) => {
      this.receiveMessages(data)
    })*/


// CLIENT FUNCTION: 
/*  sendMessage(e) {
    e.preventDefault();
    let message = {userId: this.props.userId, username: this.props.username, textMessage: this.state.textMessage}
    console.log('Sending message: ', message)

    this.socket.emit('SEND_MESSAGE', message)

    this.setState({textMessage: ''})
  }*/
