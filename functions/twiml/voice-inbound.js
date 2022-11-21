const twilio_version = require('twilio/package.json').version;

exports.handler = function(context, event, callback) {

  console.log(`Entered ${context.PATH} node version ${process.version} twilio version ${twilio_version}`);
  console.log(`event: ${JSON.stringify(event)}`);
  const twiml = new Twilio.twiml.VoiceResponse();

  const worker = 'dawong+frontline@twilio.com';
  try {
    
    twiml.say({voice: 'alice'}, 'Thanks for calling Sportsbet. We will connect you to an available representative shortly.');
    const dial = twiml.dial();
    dial.client(worker);

  } catch (e) {
    console.error(e);
    const response = new Twilio.Response();
    response.setStatusCode(500);
    response.setBody(e);
    return callback(null, response);
  }

  console.log(twiml.toString());
  callback(null, twiml);
};