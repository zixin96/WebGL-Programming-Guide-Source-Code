class StringParser {
  constructor(str) {
    this.str; // Store the string specified by the argument
    this.index; // Position in the string to be processed
    this.init(str);
  }

  // Initialize StringParser object
  init(str) {
    this.str = str;
    this.index = 0;
  }

  // Skip delimiters
  skipDelimiters() {
    for (var i = this.index, len = this.str.length; i < len; i++) {
      var c = this.str.charAt(i);
      // Skip TAB, Space, '(', ')
      if (c == "\t" || c == " " || c == "(" || c == ")" || c == '"') continue;
      break;
    }
    this.index = i;
  }

  // Skip to the next word
  skipToNextWord() {
    this.skipDelimiters();
    var n = getWordLength(this.str, this.index);
    this.index += n + 1;
  }

  // Get word
  getWord() {
    this.skipDelimiters();
    var n = getWordLength(this.str, this.index);
    if (n == 0) return null;
    var word = this.str.substr(this.index, n);
    this.index += n + 1;

    return word;
  }

  // Get integer
  getInt() {
    return parseInt(this.getWord());
  }

  // Get floating number
  getFloat() {
    return parseFloat(this.getWord());
  }
}
