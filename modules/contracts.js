'use strict';

var async = require('async');
var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var OrderBy = require('../helpers/orderBy.js');
var Router = require('../helpers/router.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/transactions.js'); ///
var Contract = require('../logic/contract.js');
var ContractCall = require('../logic/contractCall.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

// Constructor
function Contracts (cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;

	// contract deployment
	__private.assetTypes[transactionTypes.REGISTERCONTRACT] = library.logic.transaction.attachAssetType(
		transactionTypes.REGISTERCONTRACT, new Contract()
	);

	// contractcalls
	__private.assetTypes[transactionTypes.CALLCONTRACT] = library.logic.transaction.attachAssetType(
		transactionTypes.CALLCONTRACT, new ContractCall()
	);

	return cb(null, self);
}

// Events
//
//__EVENT__ `onBind`

//
Contracts.prototype.onBind = function (scope) {
	modules = scope;

	__private.assetTypes[transactionTypes.REGISTERCONTRACT].bind({
		modules: modules, library: library
	});

	__private.assetTypes[transactionTypes.CALLCONTRACT].bind({
		modules: modules, library: library
	});
};


// Export
module.exports = Contracts;