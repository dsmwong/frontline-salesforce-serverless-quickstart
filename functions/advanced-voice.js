const twilio_version = require('twilio/package.json').version;

exports.handler = function(context, event, callback) {

  console.log(`Entered ${context.PATH} node version ${process.version} twilio version ${twilio_version}`);
  console.log(`event: ${JSON.stringify(event)}`);
  const twiml = new Twilio.twiml.VoiceResponse();

  const workerMap = {
    '+61482074746': 'Daniel'
  }

  try {
    
    if(!event.Caller.startsWith('client:')) {
      twiml.say({voice: 'alice'}, `Hi, thanks for calling Sportsbet. Connecting you to ${workerMap[event.To]} now.`);
    }
    const connect = twiml.connect();
    connect.conversation({
      serviceInstanceSid: context.CONVERSATION_SERVICE_SID,
      record: 'record-from-ringing-dual',

      // Event for Voice Interaction
      statusCallback: context.STATUS_CALLBACK_URL,
      statusCallbackEvent: ['call-initiated', 'call-ringing', 'call-answered', 'call-completed'],
      statusCallbackMethod: 'POST',

      // Event webhooks for Call Recording
      recordingStatusCallback: context.STATUS_CALLBACK_URL,
      recordingStatusCallbackEvent: ['absent','in-progress', 'completed'],
      recordingStatusCallbackMethod: 'POST'
    })
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