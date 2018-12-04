(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('chart.js')) :
  typeof define === 'function' && define.amd ? define(['chart.js'], factory) :
  (global.ChartjsSunburst = factory(global.Chart));
}(this, (function (Chart) { 'use strict';

  Chart = Chart && Chart.hasOwnProperty('default') ? Chart['default'] : Chart;

  var helpers = Chart.helpers;


  var MAX_NODE_DEPTH = 5;
  var MIN_RADIANS = 2 * Math.PI / (360 * 2);
  /**
   * Controller for the sunburst chart type
   */

  Chart.defaults._set('sunburst', {
    animation: {
      // Boolean - Whether we animate the rotation of the sunburst
      animateRotate: true,
      // Boolean - Whether we animate scaling the sunburst from the centre
      animateScale: true
    },

    // The rotation for the start of the metric's arc
    rotation: -Math.PI / 2,

    hover: {
      mode: 'single'
    },

    legend: {
      display: false
    },

    tooltips: {
      enabled: false
    },

    scaleByMetric: null,
    onClick: function onClick(e) {
      var chart = this;
      var activePoints = chart.getElementsAtEvent(e);

      if (activePoints.length > 0) {
        var selectedIndex = activePoints[0]._index;
        var data = chart.config.data.datasets[0].data[selectedIndex];
        var node = chart.nodes[data.id];
        if (node.depth === 0) {
          chart.config.options.rootId = node.parentId;
        } else if (node.children.length > 0) {
          chart.config.options.rootId = data.id;
        }

        chart.reset();
        chart.update();
      } else if (chart.config.options.rootId) {
        var rootId = chart.config.options.rootId;
        var root = chart.nodes[rootId];
        if (root.parentId != null) {
          chart.config.options.rootId = root.parentId;

          chart.update();
        }
      }
    }
  });

  // eslint-disable-next-line no-shadow
  var SunburstController = (function (Chart$$1) {
    Chart$$1.controllers.sunburst = Chart$$1.DatasetController.extend({
      dataElementType: Chart$$1.elements.Arc,

      linkScales: helpers.noop,

      update: function update(reset) {
        var _this = this;

        var chart = this.chart;
        var chartArea = chart.chartArea;
        var opts = chart.options;
        var arcOpts = opts.elements.arc;
        var availableWidth = chartArea.right - chartArea.left - arcOpts.borderWidth;
        var availableHeight = chartArea.bottom - chartArea.top - arcOpts.borderWidth;
        var availableSize = Math.min(availableWidth, availableHeight);

        this._buildNodeTree();

        var meta = this.getMeta();

        this.borderWidth = 0;

        this.radius = Math.max((availableSize - this.borderWidth) / 2, 0);

        var numRings = Math.min(7, this.maxDepth + 1);
        this.radiusStep = this.radius / numRings;

        this.centerX = (chartArea.left + chartArea.right) / 2;
        this.centerY = (chartArea.top + chartArea.bottom) / 2;

        helpers.each(meta.data, function (arc, index) {
          _this.updateElement(arc, index, reset);
        });
      },
      draw: function draw() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        Chart$$1.DatasetController.prototype.draw.apply(this, args);
      },
      _getNode: function _getNode(id) {
        var node = this.nodes[id];
        if (!node) {
          node = {
            id: id,
            children: [],
            offsetRadians: 0,
            radians: 0,
            depth: 0
          };
          this.nodes[id] = node;
        }

        return node;
      },


      /**
       * Build a node tree from the flat data rows
       */
      _buildNodeTree: function _buildNodeTree() {
        var _this2 = this;

        var data = this.getDataset().data;
        this.nodes = {};
        this.chart.nodes = this.nodes;

        var root = void 0;

        data.forEach(function (_ref) {
          var id = _ref.id,
              parentId = _ref.parentId,
              value = _ref.value;

          var parent = parentId != null ? _this2._getNode(parentId) : null;
          var child = _this2._getNode(id);
          child.value = value;
          child.parentId = parentId;
          if (parent != null) {
            parent.children.push(child);
          } else {
            root = child;
          }
        });

        // override the root if specified in options
        var rootId = this.chart.options.rootId;
        if (rootId != null) {
          root = this.nodes[rootId];
        }

        // set the properties of the root node
        root.offsetRadians = 0;
        root.radians = 2 * Math.PI;
        root.depth = 0;

        var maxDepth = this._processNode(root);
        if (this.maxDepth == null) {
          this.maxDepth = maxDepth;
        }
      },


      /**
       * Recursively calculate the depth, radians and offsetRadians for a node's children
       *
       * @param {*} node the node to process
       * @return the max depth of the node subtree
       */
      _processNode: function _processNode(_ref2) {
        var children = _ref2.children,
            offsetRadians = _ref2.offsetRadians,
            radians = _ref2.radians,
            depth = _ref2.depth;

        var len = children.length;
        if (len === 0) {
          return depth;
        }

        var maxDepth = depth;

        var scaleByMetric = this.chart.options.scaleByMetric;
        var scale = void 0;

        if (scaleByMetric) {
          // if we have a metric, sort and scale the segments using that metric
          var total = children.map(function (child) {
            return child[scaleByMetric];
          }).reduce(function (a, b) {
            return a + b;
          }, 0);
          children.sort(function (c1, c2) {
            return c2[scaleByMetric] - c1[scaleByMetric];
          });
          scale = function scale(child) {
            return radians * (child.value / total);
          };
        } else {
          // otherwise all segments have the same size
          scale = function scale() {
            return radians / len;
          };
        }

        var childrenOffsetRadians = 0;

        for (var i = 0; i < len; i++) {
          var child = children[i];
          var childRadians = scale(child, i);
          child.offsetRadians = offsetRadians + childrenOffsetRadians;
          child.radians = this._getEffectiveRadians(childRadians);
          childrenOffsetRadians += childRadians;
          child.depth = depth + 1;
          if (child.children.length > 0) {
            maxDepth = Math.max(maxDepth, this._processNode(child));
          } else {
            child.isLeaf = true;
          }
        }

        return maxDepth;
      },
      _getEffectiveRadians: function _getEffectiveRadians(radians) {
        if (radians < MIN_RADIANS) {
          return 0;
        }

        return radians;
      },
      updateElement: function updateElement(arc, index, reset) {
        var chart = this.chart;
        var chartArea = chart.chartArea;
        var opts = chart.options;
        var animationOpts = opts.animation;
        var centerX = (chartArea.left + chartArea.right) / 2;
        var centerY = (chartArea.top + chartArea.bottom) / 2;

        var dataset = this.getDataset();
        var nodeId = dataset.data[index].id;
        var node = this.nodes[nodeId];

        var startAngle = 0;
        var endAngle = 0;
        var innerRadius = 0;
        var outerRadius = 0;
        var valueAtIndexOrDefault = helpers.valueAtIndexOrDefault;
        if (node.parentId != null) {
          if (!reset && animationOpts.animateScale) {
            startAngle = opts.rotation + node.offsetRadians;
            endAngle = startAngle + node.radians;
            if (node.depth > MAX_NODE_DEPTH) {
              innerRadius = 0;
              outerRadius = 0;
            } else {
              innerRadius = node.depth * this.radiusStep;
              outerRadius = innerRadius + this.radiusStep;
            }
          }
        }

        helpers.extend(arc, {
          // Utility
          _datasetIndex: this.index,
          _index: index,

          // Desired view properties
          _model: {
            id: nodeId,
            x: centerX,
            y: centerY,
            startAngle: startAngle,
            endAngle: endAngle,
            outerRadius: outerRadius,
            innerRadius: innerRadius,
            label: valueAtIndexOrDefault(dataset.label, index, chart.data.labels[index])
          }
        });

        var model = arc._model;

        // // Resets the visual styles
        var custom = arc.custom || {};
        var valueOrDefault = helpers.valueAtIndexOrDefault;
        var elementOpts = this.chart.options.elements.arc;
        model.backgroundColor = custom.backgroundColor ? custom.backgroundColor : valueOrDefault(dataset.backgroundColor, index, elementOpts.backgroundColor);
        model.borderColor = custom.borderColor ? custom.borderColor : valueOrDefault(dataset.borderColor, index, elementOpts.borderColor);
        model.borderWidth = custom.borderWidth ? custom.borderWidth : valueOrDefault(dataset.borderWidth, index, elementOpts.borderWidth);

        if (node.depth === 0) {
          model.outerRadius = 0;
        }
        if (node.isLeaf) {
          model.backgroundColor = 'rgba(255,165,31, 0.5)';
        }
        arc.pivot();
      }
    });
  });

  var SunburstChart = (function (Chart$$1) {
    Chart$$1.Sunburst = function (context, config) {
      config.type = 'sunburst';

      return new Chart$$1(context, config);
    };
  });

  SunburstController(Chart);
  SunburstChart(Chart);

  return SunburstChart;

})));
