'use strict';

var async = require('async');
var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var OrderBy = require('../helpers/orderBy.js');
var Router = require('../helpers/router.js');
// var schema = require('../schema/transactions.js'); ///
var slots = require('../helpers/slots.js');
var sql = require('../sql/transactions.js'); ///
var Contract = require('../logic/contract.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

// Constructor
function Contracts (cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;

	__private.assetTypes[transactionTypes.REGISTERCONTRACT] = library.logic.transaction.attachAssetType(
		transactionTypes.REGISTERCONTRACT, new Contract()
	);

	return cb(null, self);
}

// Export
module.exports = Contracts;