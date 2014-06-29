angular.module("selection", [])

.factory("SelectionService", function() {
	var _type = null;
	var _obj = null;
	var _listeners = [];
	
	var fireOnSelectionChanged = function() {
		for (var i = 0; i < _listeners.length; ++i) {
			var l = _listeners[i];
			l.onSelectionChanged(_type, _obj);
		}
	};
	
	return {
		setSelection: function(type, obj) {
			_type = type;
			_obj = obj;
			fireOnSelectionChanged();
		},
		
		clearSelection: function() {
			_type = null;
			_obj = null;
			fireOnSelectionChanged();
		},
		
		getSelectionType: function() {
			return _type;
		},
		
		getSelectionObject: function() {
			return _obj;
		},
		
		addListener: function(listener) {
			_listeners.push(listener);
		},
		
		removeListener: function(listener) {
			var i = listeners.indexOf(listener);
			if (i >= 0) {
				listeners.splice(i, 1);
			}
		}
	};
});
