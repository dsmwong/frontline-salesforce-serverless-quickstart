const sfdcAuthenticatePath = Runtime.getFunctions()['auth/sfdc-authenticate'].path;
const { sfdcAuthenticate } = require(sfdcAuthenticatePath);

const OPTOUT_MESSAGE = ' - https://spt.bt/A6Jx8p to opt out';

exports.handler = async function (context, event, callback) {
    console.log('Entered ', context.PATH);
    const twilioClient = context.getTwilioClient();
    let response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');
    const customerNumber = (event['MessagingBinding.Address'] && event['MessagingBinding.Address'].startsWith('whatsapp:'))
        ? event['MessagingBinding.Address'].substring(9)
        : event['MessagingBinding.Address'];
    const workerNumber = event['WorkerBinding.ProxyAddress'];
    const conversationSid = event.ConversationSid;
    switch (event.EventType) {
        case 'onConversationAdded': {
            const isIncomingConversation = !!customerNumber;
            if (isIncomingConversation) {
                const sfdcConnectionIdentity = await sfdcAuthenticate(context, null); // this is null due to no user context, default to env. var SF user
                const { connection } = sfdcConnectionIdentity;
                const customerDetails = await getCustomerByNumber(customerNumber, connection) || {};
                await twilioClient.conversations
                    .conversations(conversationSid)
                    .update({friendlyName: customerDetails.display_name || customerNumber});
            }
            break;
        } case 'onParticipantAdded': {
            const participantSid = event.ParticipantSid;
            const isCustomer = customerNumber && !event.Identity;
            if (isCustomer) {
                const customerParticipant = await twilioClient.conversations
                    .conversations(conversationSid)
                    .participants
                    .get(participantSid)
                    .fetch();
                const sfdcConnectionIdentity = await sfdcAuthenticate(context, null);
                const { connection } = sfdcConnectionIdentity;
                const customerDetails = await getCustomerByNumber(customerNumber, connection) || {};
                await setCustomerParticipantProperties(customerParticipant, customerDetails);
            }
            break;
        } case 'onMessageAdd' : {
            // add Opt-out for outbound messages
            const isOutgoingMessage = !!event.ClientIdentity;
            console.log(`event ${JSON.stringify(event)}`);
            console.log(`Message Body ${event.Body}`);
            if( isOutgoingMessage )
            {
                response = { body: `${event.Body} ${OPTOUT_MESSAGE}`}
            }
            //return callback(null, { body: `${event.Body} ${OPTOUT_MESSAGE}`});
            break;
        } case 'onConversationAdded':
        case 'onConversationStateUpdated':
        case 'onParticipantUpdated': {
            console.log('Event type: ', event.EventType);
            console.log('Event payload: ', JSON.stringify(event, null,2));
            break;
        }
        case 'onConversationUpdated': {
            console.log('Event type: ', event.EventType);
            console.log('Event payload: ', JSON.stringify(event, null,2));

            const sfdcConnectionIdentity = await sfdcAuthenticate(context, null); // this is null due to no user context, default to env. var SF user
            const { connection } = sfdcConnectionIdentity;

            // find the customer participant
            const convParticipants = await twilioClient.conversations.conversations(conversationSid).participants.list();
            console.log('Participants: ', JSON.stringify(convParticipants, null,2));
            
            // assume customer participant is when identity is null
            const customerParticipant = convParticipants.find((p) => p.identity === null)
            console.log('Customer Participants: ', customerParticipant);
            const custAttribute = JSON.parse(customerParticipant.attributes);

            const agentParticipant = convParticipants.find((p) => p.identity !== null)
            console.log('Agent Participants: ', agentParticipant);


            if( event.Attributes && event.State === "active") {

                // Active conversation, update the customer record with call status
                console.log('Event Attributes: ', JSON.stringify(JSON.parse(event.Attributes), null,2));
                const attributes = JSON.parse(event.Attributes);

                const frontlineEvents = attributes["frontline.events"]
                const latestFrontlineEvent = frontlineEvents[(frontlineEvents.length-1)]

                console.log('Latest Frontline Event: ', latestFrontlineEvent);
                const direction = latestFrontlineEvent.inbound ? "Inbound" : "Outbound"

                const fromNumber = latestFrontlineEvent.inbound ? customerNumber : workerNumber
                const toNumber = latestFrontlineEvent.inbound ? workerNumber : customerNumber

                const [lastCall, ...x] = await twilioClient.calls.list({from: fromNumber, to: toNumber, limit: 1});
                console.log('Last Call: ', lastCall);

                const parentCallSid = lastCall.parentCallSid;
                const recordings = await twilioClient.recordings.list({callSid: parentCallSid});
                console.log('Recordings: ', recordings);

                // Write the Call interaction to SFDC
                const taskResult = await connection.sobject("Task").create({
                    ActivityDate: new Date(),
                    CallType: direction,
                    Type: "Call",
                    TaskSubType: "Call",
                    CallDurationInSeconds: latestFrontlineEvent.duration,
                    Description: `Call SID: ${lastCall.sid}\nConversation SID: ${conversationSid}\nCall with ${agentParticipant.identity} to ${custAttribute.display_name}\nCall Recording: ${recordings[0].sid}`,
                    Status: "Completed",
                    Subject: `${direction} Call Completed with ${agentParticipant.identity}`,
                    WhoId: custAttribute.customer_id,
                }); 
                console.log('Task Result: ', taskResult);
            } else if (event.State === "closed") {
                console.log('Conversation Closed');

                // Write the SMS Conversation to SFDC when conversation is closed

                const messages = await twilioClient.conversations.conversations(conversationSid).messages.list();
                console.log('Messages: ', JSON.stringify(messages, null,2));
                const conversationString = messages.map((m) => `[${m.author}] ${m.body}`).join("\n");
                
                const taskResult = await connection.sobject("Task").create({
                    ActivityDate: new Date(),
                    Description: `Conversation SID: ${conversationSid}\nEnded Conversation with ${event.FriendlyName}\n\n${conversationString}`,
                    Status: "Completed",
                    Subject: `Closing Conversation with ${event.FriendlyName}`,
                    WhoId: custAttribute.customer_id,
                }); 
                console.log('Close Conversation Task Result: ', taskResult);
            }
            break;
        } default: {
            console.log('Unknown event type: ', event.EventType);
            response.setStatusCode(422);
        }
    }
    return callback(null, response);
};

const getCustomerByNumber = async (number, sfdcConn) => {
    console.log('Getting Customer details by #: ', number);
    let sfdcRecords = [];
    try {
        sfdcRecords = await sfdcConn.sobject("Contact")
            .find(
                {
                    'MobilePhone': number
                },
                {
                    Id: 1,
                    Name: 1,
                }
            )
            .sort({ LastModifiedDate: -1 })
            .limit(1)
            .execute();
        console.log("Fetched # SFDC records for contact by #: " + sfdcRecords.length);
        if (sfdcRecords.length === 0) {
            return;
        }
        const sfdcRecord = sfdcRecords[0];
        return {
            display_name: sfdcRecord.Name,
            customer_id: sfdcRecord.Id
        }
    } catch (err) {
        console.error(err);
    }
};

const setCustomerParticipantProperties = async (customerParticipant, customerDetails) => {
    const participantAttributes = JSON.parse(customerParticipant.attributes);
    const customerProperties = {
        attributes: JSON.stringify({
            ...participantAttributes,
            customer_id: participantAttributes.customer_id || customerDetails.customer_id,
            display_name: participantAttributes.display_name || customerDetails.display_name
        })
    };

    // If there is difference, update participant
    if (customerParticipant.attributes !== customerProperties.attributes) {
        // Update attributes of customer to include customer_id
        updatedParticipant = await customerParticipant
            .update(customerProperties)
            .catch(e => console.log("Update customer participant failed: ", e));
    }
}