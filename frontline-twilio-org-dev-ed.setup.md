https://twilio-org-dev-ed.lightning.force.com/

dawong+orgadmin01@twilio.com

Twilio Console: AC8ca3346c6960207c84be049116c6db62

## Frontline Configurations

SSO Workspace ID: `fl-org-dev-ed`

SSO Realm SID: JBe774570e7393341f213126f5b0865ffc

SSO IDP Issure: https://twilio-org-dev-ed.my.salesforce.com

SSO URL : https://twilio-org-dev-ed.my.salesforce.com/idp/endpoint/HttpRedirect


Routing: `Do no route`


CRM Callback: https://function-frontline-salesforce-3171-dev.twil.io/crm

Outgoing Callback: https://function-frontline-salesforce-3171-dev.twil.io/outgoing-conversation

Templates Callback: https://function-frontline-salesforce-3171-dev.twil.io/templates

Voice Calling Enabled: Default App (`APf1e0d0f43928dc65dc41c933e87c33dc`)

## Conversation Configuration

Conversations SID: IS2ab0087e4cd347859e32b15f1aa92763

Pre and Post Webhooks: https://function-frontline-salesforce-3171-dev.twil.io/inbound-conversation

Pre-webhooks
* `onConversationAdd`, `onMessageAdd`
  
Post-webhooks
* `onParticipantAdded`

## Functions

`function-frontline-salesforce` (ZSdde7ca90b36c187505672753a9186357)

| Parameter | Value |
|-----| -----|
| DEFAULT_WORKER | `achun+jcagent02@twilio.com` |
| SFDC_INSTANCE_URL | `https://twilio-org-dev-ed.my.salesforce.com` |
| WHATSAPP_NUMBER | `whatsapp:+14158867393` |
| SYNC_SERVICE_SID | `IS79e6d9ec70e386c4f7a9ec9cae20de7b` | 
| SF_USERNAME | `achun+flsfdc01@twilio.com`
| SF_CONSUMER_KEY | `3MVG9JEx.BE6yifNSkKLZDBCGqojWUFH7U42CrbsWlc1yi32A0oCe6Dmeo4HIrTStuGIIpX4jEToWSIdUqM4Y` | 
| SMS_NUMBER | +17077776015 |

**Sync Services**

Sync Service SID: `IS79e6d9ec70e386c4f7a9ec9cae20de7b`


**Tips**
AU Phone Number +61482072002

If you need to switch phone numbers - change SFDC person mobile number, delete existing conversation.


**Requirements**

- [x] Must integrate with Salesforce
- [x] Must be able to show the customer opt-in status in the phone dialer/ mobile app (Opt In Status stored in Salesforce Sales Cloud)
- [ ] Must be able to automatically append an opt-out statement/URL Link in SMS messages
- [ ] Must be able to record MMS and SMS
- [ ] Provide solution for 1to1 contact + Team based contact/routing when users on leave out of hours etc