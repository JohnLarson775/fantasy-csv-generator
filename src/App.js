// Perform imports
import React from 'react';
import { Form, Row, Col, Container, Image, ButtonGroup, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';
import AWS from 'aws-sdk';
import './App.css';
import instructions from './instructions.jpg';

// Credentials for aws (Needed for presignedUrl creation)
const accessKeyId = 'AKIA5AXEBFX627KVFFZR';
const secretAccessKey = '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';
const region = 'us-west-1'

const s3 = new AWS.S3({
    region: region,
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
});

class App extends React.Component{

  constructor(props) {
    super(props);
    
    this.state = {
      league_id: "",
      year: "2019",
      swid: "",
      espn_s2: "",
      is_loading: false,
      is_error: false
    };
  };

  validateForm() {
    return this.state.league_id.length > 0 && this.state.year.length > 0 && 
      this.state.swid.length > 10 && this.state.espn_s2.length > 10;
  };

  callLambda = event => {
    this.setState({is_loading: true});
    // send event object to lambda function with axios post
    axios.post('https://1s6gvcsrp8.execute-api.us-west-1.amazonaws.com/default/medium-lambda-tutorial',
    { league_id: this.state.league_id,
      year: this.state.year,
      swid: this.state.swid,
      espn_s2: this.state.espn_s2,
    },
    console.log('Creating CSVs...'))
    .then(response => {
      if (response.data.statusCode === 400) {
        console.log(response.data.message)
        this.setState({is_loading: false, is_error: true})
      } else {
        const boxscores_url = s3.getSignedUrl('getObject', {
          Bucket: 'fantasy-csv',
          Key: `${this.state.league_id}_boxscores_${this.state.year.slice(-2)}.csv`,
          Expires: 60 * 5
        })
        const seasonscores_url = s3.getSignedUrl('getObject', {
          Bucket: 'fantasy-csv',
          Key: `${this.state.league_id}_seasonscores_${this.state.year.slice(-2)}.csv`,
          Expires: 60 * 5
        })
        const matchups_url = s3.getSignedUrl('getObject', {
          Bucket: 'fantasy-csv',
          Key: `${this.state.league_id}_matchups_${this.state.year.slice(-2)}.csv`,
          // preSignedUrl link is good for 5 minutes
          Expires: 60 * 5
        })
        console.log(response.data.message)
        this.setState({
          boxscores_url: boxscores_url,
          seasonscores_url: seasonscores_url,
          matchups_url: matchups_url,
          is_loading: false,
          is_error: false,
          done_loading: true
        })
      }
    })
  };

  render () {
    return (
      <Container className = "App">
        <h1>FantaCSV Football</h1>
        <p>
          <em>Input basic league info, output CSV files for personal exploration and insights. Available only for ESPN leagues.</em>
        </p>
        <p></p>
        <p>
          <strong>League ID</strong> is a six-digit number found in your league's url.<br></br>
          <strong>SWID</strong> and <strong>ESPN_s2</strong> are the relevant cookies associated with your league.
        </p>
        <Row>
          <Col>
            <p>Refer to the figure for help accessing cookies in Chrome:</p>
            <ol>
              <li>While on your league homepage, click the three dots in the upper right corner of the browser > more tools > developer tools.</li>
              <li>Locate the "Application" tab.</li>
              <li>From here, you can view cookies.</li>
              <li>Use the search bar to find the appropriate cookies. Copy and paste the values below.</li>
            </ol>
            <p>You can follow a similar process to access cookies in other browsers.</p>
          </Col>
          <Col style = {{paddingTop:'8px', paddingBottom:'8px'}}>
            <Image src = {instructions} width = {400} rounded/>
          </Col>
        </Row>
        <Form.Row>
          <Col>
            <Form.Group>
              <Form.Label className = "Form">League ID</Form.Label>
                <Form.Control 
                  placeholder = "12345..."
                  onChange = {(event) => this.setState({ league_id: event.target.value, done_loading: false, is_error: false })}
                  value = {this.state.league_id}/>
            </Form.Group>
          </Col>
          <Col>
            <Form.Label className = "Form">Year</Form.Label>
              <Form.Control 
                as = "select"
                onChange = {(event) => this.setState({ year: event.target.value, done_loading: false, is_error: false })}
                value = {this.state.year}>
                <option>2019</option>
                <option>2018</option>
                <option>2017</option>
                <option>2016</option>
                <option>2015</option>
                <option>2014</option>
              </Form.Control>
          </Col>
          <Col>
            <Form.Label className = "Form">SWID</Form.Label>
              <Form.Control 
                placeholder = "{5CA4F649-00CF-421M-B1M5-4700DEXAMPLE}"
                onChange = {(event) => this.setState({ swid: event.target.value, done_loading: false, is_error: false })}
                value = {this.state.swid}/>
          </Col>
        </Form.Row>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label className = "Form">ESPN_s2</Form.Label>
              <Form.Control
                placeholder = "A looooooooong string of text" as = "textarea" rows = "2"
                onChange = {(event) => this.setState({ espn_s2: event.target.value, done_loading: false, is_error: false })}
                value = {this.state.espn_s2}/>
            </Form.Group>
          </Col>
        </Row>
        <Row> 
          <Col>
            {!this.state.is_loading && <Button disabled = {!this.validateForm()} onClick = {this.callLambda}>Submit</Button>}
            {this.state.is_loading && 
              <Button disabled>
                <Spinner
                  as = "span"
                  animation = "grow"
                  size = "sm"
                  role = "status"
                /> Generating files...
              </Button>}
            {this.state.is_error && !this.state.is_loading && 
              <span>Whoops! Double-check league info. Did this league exist in {this.state.year}?</span>}
            {this.state.done_loading && !this.state.is_loading &&<ButtonGroup>
              <Button href = {this.state.boxscores_url} variant = "link">{this.state.league_id}_boxscores_{this.state.year.slice(-2)}.csv</Button>
              <Button href = {this.state.seasonscores_url} variant = "link">{this.state.league_id}_seasonscores_{this.state.year.slice(-2)}.csv</Button>
              <Button href = {this.state.matchups_url} variant = "link">{this.state.league_id}_matchups_{this.state.year.slice(-2)}.csv</Button>
            </ButtonGroup>}
          </Col>
        </Row>
      </Container>
    );
  };
}

export default App;