import { WIDGETS } from 'paraview-glance/src/palette';
import { mapState } from 'vuex';

// ----------------------------------------------------------------------------

export function updateProps(viewWidget, propsToUpdate) {
  const propNames = Object.keys(propsToUpdate);
  for (let i = 0; i < propNames.length; i++) {
    const name = propNames[i];
    const props = viewWidget[`get${name}Props`]();
    viewWidget[`set${name}Props`](Object.assign(props, propsToUpdate[name]));
  }
}

// ----------------------------------------------------------------------------

export default (toolName, extraComponent = {}) => ({
  name: `${toolName}Tool3D`,
  props: {
    // should always be a valid proxy id
    targetPid: { required: true },
    /**
     * Structure of data:
     * {
     *   name: String,
     *   points[N]: [[xyz], ...],
     *   axis: 0|1|2|null,
     *   color: String,
     *   textSize: 12,
     * }
     */
    toolData: { required: true },
  },
  data() {
    return {
      name: `3D ${toolName}`,
      finalized: false,
      axis: null,
      widgetPid: -1,
      targetViewId: -1,
      color: WIDGETS[0],
      textSize: 16,
      measurements: this.initialMeasurements(),
      measurementLabels: this.getMeasurementLabels(),
    };
  },
  computed: {
    targetProxy() {
      return this.$proxyManager.getProxyById(this.targetPid);
    },
    targetView() {
      return this.$proxyManager.getProxyById(this.targetViewId);
    },
    widgetProxy() {
      return this.$proxyManager.getProxyById(this.widgetPid);
    },
    targetRepresentation() {
      return this.$proxyManager.getRepresentation(
        this.targetProxy,
        this.targetView
      );
    },
    displayedMeasurements() {
      return this.getDisplayedMeasurements();
    },
    ...mapState('widgets', {
      distanceUnitSymbol: (state) => state.distanceUnitSymbol,
      distanceUnitFactor: (state) => state.distanceUnitFactor,
    }),
  },
  watch: extraComponent.watch || {},
  proxyManagerHooks: {
    onProxyModified(proxy) {
      if (proxy && proxy === this.targetRepresentation && this.widgetProxy) {
        if (this.finalized) {
          this.updateWidgetVisibility();
        }
      }
      if (proxy === this.widgetProxy) {
        const state = this.widgetProxy.getWidgetState();
        const numberOfHandles = state.getHandleList().length;
        if (numberOfHandles === 1 && this.targetViewId === -1) {
          // bind to slice and view
          // assumes mouseFocusedViewId is not -1
          this.targetViewId = this.mouseFocusedViewId;
          // target rep should now exist
          this.constrainPickableViews(this.targetViewId);
        }

        if (!this.finalized && this.donePlacing()) {
          // widget is finalized
          this.finalized = true;
        }

        this.updateMeasurements();

        if (this.finalized) {
          this.saveData();
        }
      }
    },
  },
  created() {
    this.mouseFocusedViewId = -1;
  },
  mounted() {
    const proxy = this.$proxyManager.createProxy('Widgets', toolName);
    this.widgetPid = proxy.getProxyId();
    console.log({ proxy });

    if (this.toolData) {
      const { name, points, color, textSize } = this.toolData;
      this.name = name;
      this.color = color;
      this.textSize = textSize;

      const view = this.$proxyManager
        .getViews()
        .find((v) => v.isA('vtkViewProxy'));
      if (!view) {
        throw new Error('Cannot restore saved data: invalid axis');
      }
      this.targetViewId = view.getProxyId();

      // maybe I should verify the structure of toolData against a schema...
      const widgetState = proxy.getWidgetState();
      for (let i = 0; i < points.length; i++) {
        const handle = widgetState.addHandle();
        handle.setOrigin(...points[i]);
      }

      this.finalized = true;
    }

    this.addWidgetToViews(proxy);

    if (this.finalized) {
      this.updateMeasurements();
      this.updateWidgetVisibility();
    }
  },
  beforeDestroy() {
    this.remove();
  },
  methods: {
    addWidgetToViews(proxy) {
      if (this.targetProxy) {
        proxy
          .getWidget()
          .placeWidget(this.targetProxy.getDataset().getBounds());
      }

      const view3dHandler = (view, widgetManager, viewWidget) => {
        this.setupViewWidget(viewWidget);
        viewWidget.setVisibility(true);

        const moveSub = view.getInteractor().onMouseMove(() => {
          if (this.targetViewId !== -1) {
            return;
          }
          if (view.getProxyId() === this.mouseFocusedViewId) {
            return;
          }
          this.mouseFocusedViewId = view.getProxyId();

          if (!viewWidget.getVisibility()) {
            viewWidget.setVisibility(true);
            proxy
              .getAllViewWidgets()
              .filter((vw) => vw !== viewWidget)
              .forEach((vw) => vw.setVisibility(false));

            // render visibility changes
            widgetManager.renderWidgets();
            this.$proxyManager.renderAllViews();
          }
          // higher event listener priority
        }, viewWidget.getPriority() + 1);

        this.setWidgetColor(viewWidget, this.color);
        this.setWidgetTextSize(viewWidget, this.textSize);
        widgetManager.grabFocus(viewWidget);
        widgetManager.enablePicking();

        return [moveSub.unsubscribe];
      };

      const view2dHandler = (view, widgetManager, viewWidget) => {
        widgetManager.removeWidget(viewWidget);
      };

      proxy.addToViews();
      proxy.executeViewFuncs({
        View3D: view3dHandler,
        View2D_X: view2dHandler,
        View2D_Y: view2dHandler,
        View2D_Z: view2dHandler,
      });
    },
    updateWidgetVisibility() {
      const viewWidget = this.widgetProxy.getViewWidget(this.targetView);
      if (!viewWidget) {
        return;
      }

      viewWidget.setVisibility(true);
      this.renderViewWidgets();
    },
    remove() {
      if (this.widgetProxy) {
        this.widgetProxy.releaseFocus();
        this.widgetProxy.removeFromViews();
        this.$proxyManager.deleteProxy(this.widgetProxy);
        this.widgetPid = -1;
      }
    },
    setName(name) {
      this.name = name;
      this.renderViewWidgets();
      this.saveData();
    },
    setColor(colorHex) {
      this.color = colorHex;
      this.widgetProxy
        .getAllViewWidgets()
        .forEach((viewWidget) => this.setWidgetColor(viewWidget, colorHex));
      this.renderViewWidgets();
      this.saveData();
    },
    setTextSize(size) {
      this.textSize = size;
      this.widgetProxy
        .getAllViewWidgets()
        .forEach((viewWidget) => this.setWidgetTextSize(viewWidget, size));
      this.renderViewWidgets();
      this.saveData();
    },
    renderViewWidgets() {
      this.$proxyManager.getViews().forEach((view) => {
        const manager = view.getReferenceByName('widgetManager');
        if (manager) {
          manager.renderWidgets();
          view.renderLater();
        }
      });
    },
    saveData() {
      const state = this.widgetProxy.getWidgetState();
      const data = {
        name: this.name,
        points: state.getHandleList().map((handle) => handle.getOrigin()),
        color: this.color,
        textSize: this.textSize,
        axis: null,
      };
      console.log('saveData', data);
      this.$emit('saveData', data);
    },
    emitRemove() {
      this.$emit('remove');
    },
    constrainPickableViews(onlyPickableViewId) {
      this.$proxyManager.getViews().forEach((view) => {
        const viewWidget = this.widgetProxy.getViewWidget(view);
        if (viewWidget) {
          viewWidget.setPickable(view.getProxyId() === onlyPickableViewId);
        }
      });
    },
    initialMeasurements() {
      throw new Error('initialMeasurements not implemented');
    },
    getMeasurementLabels() {
      throw new Error('getMeasurementLabels not implemented');
    },
    getDisplayedMeasurements() {
      throw new Error('getDisplayedMeasurements not implemented');
    },
    updateMeasurements() {
      throw new Error('updateMeasurements not implemented');
    },
    donePlacing() {
      throw new Error('donePlacing not implemented');
    },
    setupViewWidget(/* viewWidget */) {
      throw new Error('setupViewWidget not implemented');
    },
    setWidgetColor(/* viewWidget, hex */) {
      throw new Error('setWidgetColor not implemented');
    },
    setWidgetTextSize(/* viewWidget, size */) {
      throw new Error('setWidgetTextSize not implemented');
    },
    ...(extraComponent.methods || {}),
  },
  template: `
    <div>
      <slot
        :finalized="finalized"
        :tool-name="name"
        :color="color"
        :text-size="textSize"
        :measurements="displayedMeasurements"
        :labels="measurementLabels"
        :remove="emitRemove"
        :set-name="setName"
        :set-color="setColor"
        :set-text-size="setTextSize"
      >
      </slot>
    </div>
  `,
});
