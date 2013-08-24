/*
 * Copyright (C) 2013 uPhyca Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function() {

var _setItem = localStorage.setItem.bind(localStorage);
var _getItem = localStorage.getItem.bind(localStorage);
var _removeItem = localStorage.removeItem.bind(localStorage);


localStorage.setItem = function(k, v) {
  localStorage.removeItem(k);
  var tuple = [];
  if (typeof v === 'number') {
    tuple[0] = 1;
    tuple[1] = v;
  } else {
    tuple[0] = 2;
    var s = JSON.stringify(v);
    tuple[1] = s.length;
    for(var i = 0, len = s.length; i < len; ++i) {
      tuple[2 + i] = s.charCodeAt(i);
    }
  }
  for (var i = 0, len = tuple.length; i < len; ++i) {
    _setItem(k + i.toString(10), tuple[i]);
  }
};

localStorage.getItem = function(k) {
  var type = _getItem(k + "0");
  if (!type) {
    return null;
  } else if (type == 1) {
    return _getItem(k + "1");
  } else {
    var len = parseInt(_getItem(k + "1"), 10);
    var chars = [];
    for (var i = 0; i < len; ++i) {
      var c = _getItem(k + (2+i).toString(10));
      chars.push(c);
    }
    return JSON.parse(chars.map(function(each) {
      return String.fromCharCode(each);
    }).join(""));
  }
};

localStorage.removeItem = function(k) {
  var type = _getItem(k + "0");
  if (!type) {
    return;
  } else if (type == 1) {
    _removeItem(k + "0");
    _removeItem(k + "1");
  } else {
    var len = _getItem(k + "1");
    _removeItem(k + "0");
    _removeItem(k + "1");
    for (var i = 0; i < len; ++i) {
      _removeItem(k + (2+i).toString(10));
    }
  }
};


})();
