
module.exports = function (require) {

  let logger = require('log4js').getLogger('orchestrator');

  const ORG = process.env.ORG || null;
  if (ORG !== 'gateway') {
    logger.info('enabled for gateway only');
    return;
  }

  let invoke = require('../lib-fabric/invoke-transaction.js');
  let peerListener = require('../lib-fabric/peer-listener.js');

  logger.info('registering for block events');

  peerListener.registerBlockEvent(block => {
    try {
      block.data.data.forEach(blockData => {

        logger.info(`got block no. ${block.header.number}`);

        blockData.payload.data.actions.forEach(action => {
          let extension = action.payload.action.proposal_response_payload.extension;

          let event = extension.events;
          if(!event.event_name) {
            return;
          }

          logger.trace(`event ${event.event_name}`);

          if(event.event_name === 'debit') {
            let payload = JSON.parse(event.payload.toString());
            logger.trace('debit', JSON.stringify(payload));
            moveByEvent(payload);
          }
        }); // thru action elements
      }); // thru block data elements
    }
    catch(e) {
      logger.error('caught while processing block event', e);
    }
  });

  peerListener.eventHub.on('connected', function() {
    logger.info('connected');
  });

  function moveByEvent(payload) {
    logger.debug('invoking credit of %s for %s', payload);

    let args = ["123", "3"];

    return invoke.invokeChaincode(['peer0.gateway.hypermusic.com:7051'], 'gateway-producer',
      'payment', 'credit', args, 'orchestrator', ORG)
      .then(transactionId => {
        logger.info('move success', transactionId);
      })
      .catch(e => {
        logger.error('move error', e);
      });
  }

};
