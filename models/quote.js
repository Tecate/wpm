var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var QuoteSchema = new Schema({
  author: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  quote: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Quote', QuoteSchema);