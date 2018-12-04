import Chart from 'chart.js';

const { helpers } = Chart;

const MAX_NODE_DEPTH = 5;
const MIN_RADIANS = (2 * Math.PI) / (360 * 2);
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
  onClick: function(e) {
    const chart = this;
    const activePoints = chart.getElementsAtEvent(e);

    if (activePoints.length > 0) {
      const selectedIndex = activePoints[0]._index;
      const data = chart.config.data.datasets[0].data[selectedIndex];
      const node = chart.nodes[data.id];
      if (node.depth === 0) {
        chart.config.options.rootId = node.parentId;
      } else if (node.children.length > 0) {
        chart.config.options.rootId = data.id;
      }

      chart.reset();
      chart.update();
    } else if (chart.config.options.rootId) {
      const rootId = chart.config.options.rootId;
      const root = chart.nodes[rootId];
      if (root.parentId != null) {
        chart.config.options.rootId = root.parentId;

        chart.update();
      }
    }
  }
});

// eslint-disable-next-line no-shadow
export default Chart => {
  Chart.controllers.sunburst = Chart.DatasetController.extend({
    dataElementType: Chart.elements.Arc,

    linkScales: helpers.noop,

    update(reset) {
      const chart = this.chart;
      const chartArea = chart.chartArea;
      const opts = chart.options;
      const arcOpts = opts.elements.arc;
      const availableWidth = chartArea.right - chartArea.left - arcOpts.borderWidth;
      const availableHeight = chartArea.bottom - chartArea.top - arcOpts.borderWidth;
      const availableSize = Math.min(availableWidth, availableHeight);

      this._buildNodeTree();

      const meta = this.getMeta();

      this.borderWidth = 0;

      this.radius = Math.max((availableSize - this.borderWidth) / 2, 0);

      const numRings = Math.min(7, this.maxDepth + 1);
      this.radiusStep = this.radius / numRings;

      this.centerX = (chartArea.left + chartArea.right) / 2;
      this.centerY = (chartArea.top + chartArea.bottom) / 2;

      helpers.each(meta.data, (arc, index) => {
        this.updateElement(arc, index, reset);
      });
    },

    draw(...args) {
      Chart.DatasetController.prototype.draw.apply(this, args);
    },

    _getNode(id) {
      let node = this.nodes[id];
      if (!node) {
        node = {
          id,
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
    _buildNodeTree() {
      const data = this.getDataset().data;
      this.nodes = {};
      this.chart.nodes = this.nodes;

      let root;

      data.forEach(({ id, parentId, value }) => {
        const parent = parentId != null ? this._getNode(parentId) : null;
        const child = this._getNode(id);
        child.value = value;
        child.parentId = parentId;
        if (parent != null) {
          parent.children.push(child);
        } else {
          root = child;
        }
      });

      // override the root if specified in options
      const rootId = this.chart.options.rootId;
      if (rootId != null) {
        root = this.nodes[rootId];
      }

      // set the properties of the root node
      root.offsetRadians = 0;
      root.radians = 2 * Math.PI;
      root.depth = 0;

      const maxDepth = this._processNode(root);
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
    _processNode({ children, offsetRadians, radians, depth }) {
      const len = children.length;
      if (len === 0) {
        return depth;
      }

      let maxDepth = depth;

      const scaleByMetric = this.chart.options.scaleByMetric;
      let scale;

      if (scaleByMetric) {
        // if we have a metric, sort and scale the segments using that metric
        const total = children.map(child => child[scaleByMetric]).reduce((a, b) => a + b, 0);
        children.sort((c1, c2) => c2[scaleByMetric] - c1[scaleByMetric]);
        scale = child => radians * (child.value / total);
      } else {
        // otherwise all segments have the same size
        scale = () => radians / len;
      }

      let childrenOffsetRadians = 0;

      for (let i = 0; i < len; i++) {
        const child = children[i];
        const childRadians = scale(child, i);
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

    _getEffectiveRadians(radians) {
      if (radians < MIN_RADIANS) {
        return 0;
      }

      return radians;
    },

    updateElement(arc, index, reset) {
      const chart = this.chart;
      const chartArea = chart.chartArea;
      const opts = chart.options;
      const animationOpts = opts.animation;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      const dataset = this.getDataset();
      const nodeId = dataset.data[index].id;
      const node = this.nodes[nodeId];

      let startAngle = 0;
      let endAngle = 0;
      let innerRadius = 0;
      let outerRadius = 0;
      const valueAtIndexOrDefault = helpers.valueAtIndexOrDefault;
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
          startAngle,
          endAngle,
          outerRadius,
          innerRadius,
          label: valueAtIndexOrDefault(dataset.label, index, chart.data.labels[index])
        }
      });

      const model = arc._model;

      // // Resets the visual styles
      const custom = arc.custom || {};
      const valueOrDefault = helpers.valueAtIndexOrDefault;
      const elementOpts = this.chart.options.elements.arc;
      model.backgroundColor = custom.backgroundColor
        ? custom.backgroundColor
        : valueOrDefault(dataset.backgroundColor, index, elementOpts.backgroundColor);
      model.borderColor = custom.borderColor
        ? custom.borderColor
        : valueOrDefault(dataset.borderColor, index, elementOpts.borderColor);
      model.borderWidth = custom.borderWidth
        ? custom.borderWidth
        : valueOrDefault(dataset.borderWidth, index, elementOpts.borderWidth);

      if (node.depth === 0) {
        model.outerRadius = 0;
      }
      if (node.isLeaf) {
        model.backgroundColor = 'rgba(255,165,31, 0.5)';
      }
      arc.pivot();
    }
  });
};
