import { mapState, mapActions } from 'vuex';

import PopUp from 'paraview-glance/src/components/widgets/PopUp';
import PalettePicker from 'paraview-glance/src/components/widgets/PalettePicker';
import SourceSelect from 'paraview-glance/src/components/widgets/SourceSelect';
import SvgIcon from 'paraview-glance/src/components/widgets/SvgIcon';
import { WIDGETS } from 'paraview-glance/src/palette';

import AngleMeasurementTool2D from 'paraview-glance/src/components/tools/MeasurementTools/2dtools/AngleMeasurementTool';
import RulerMeasurementTool2D from 'paraview-glance/src/components/tools/MeasurementTools/2dtools/RulerMeasurementTool';
import TextAnnotationTool2D from 'paraview-glance/src/components/tools/MeasurementTools/2dtools/TextAnnotationTool';

import AngleMeasurementTool3D from 'paraview-glance/src/components/tools/MeasurementTools/3dtools/AngleMeasurementTool';
import RulerMeasurementTool3D from 'paraview-glance/src/components/tools/MeasurementTools/3dtools/RulerMeasurementTool';

// ----------------------------------------------------------------------------

const ToolList2D = [
  {
    name: '2D Angle',
    icon: 'angle-tool',
    component: AngleMeasurementTool2D,
  },
  {
    name: '2D Ruler',
    icon: 'length-tool',
    component: RulerMeasurementTool2D,
  },
  {
    name: '2D Text',
    icon: 'text-tool',
    component: TextAnnotationTool2D,
  },
];

const ToolList3D = [
  {
    name: '3D Angle',
    icon: 'angle-tool',
    component: AngleMeasurementTool3D,
  },
  {
    name: '3D Ruler',
    icon: 'length-tool',
    component: RulerMeasurementTool3D,
  },
];

// ----------------------------------------------------------------------------

const ComponentToTool = {};
ToolList2D.forEach((tool) => {
  ComponentToTool[tool.component.name] = tool;
});
ToolList3D.forEach((tool) => {
  ComponentToTool[tool.component.name] = tool;
});

// ----------------------------------------------------------------------------

export default {
  name: 'MeasurementTools',
  props: ['enabled'],
  components: {
    PopUp,
    PalettePicker,
    SvgIcon,
    SourceSelect,
  },
  inject: ['$notify', 'girderRest'],
  data() {
    return {
      uiToolList2D: ToolList2D,
      uiToolList3D: ToolList3D,
      active2DToolIndex: undefined,
      active3DToolIndex: undefined,
      activeToolType: undefined,
      targetPid: -1,
      pendingTool: null,
      palette: WIDGETS,
    };
  },
  computed: {
    ...mapState('widgets', ['measurements']),
    tools() {
      // format:
      // { name:str, component:str, data:{} }
      let tools = [];
      if (this.measurements[this.targetPid]) {
        const measurements = this.measurements[this.targetPid];
        tools = tools.concat(
          measurements.map((m) => ({
            ...ComponentToTool[m.componentName],
            data: m.data,
          }))
        );
      }

      if (this.pendingTool) {
        tools = tools.concat(this.pendingTool);
      }

      return tools;
    },
    targetProxy() {
      return this.$proxyManager.getProxyById(this.targetPid);
    },
  },
  watch: {
    enabled(enable) {
      if (enable) {
        this.enableActiveTool();
      } else {
        this.clearActiveTool();
      }
    },
    targetPid() {
      if (this.enabled) {
        this.clearActiveTool();
      }
    },
  },
  methods: {
    ...mapActions('widgets', [
      'addMeasurementTool',
      'removeMeasurementTool',
      'updateMeasurementTool',
    ]),
    filterImageData(source) {
      return (
        source.getProxyName() === 'TrivialProducer' &&
        source.getType() === 'vtkImageData'
      );
    },
    setTargetDataset(sourceId) {
      this.targetPid = sourceId;
    },
    toggleActiveTool(toolIndex, toolType) {
      this.activeToolType = toolType;
      if (this.enabled) {
        if (toolIndex === undefined) {
          this.$emit('enable', false);
        } else {
          this.removeTool(this.active2DToolIndex);
          this.removeTool(this.active3DToolIndex);

          if (this.activeToolType === '2D') {
            this.active2DToolIndex = toolIndex;
          } else if (this.activeToolType === '3D') {
            this.active3DToolIndex = toolIndex;
          }
          this.enableActiveTool();
        }
      } else if (toolIndex !== undefined) {
        if (this.activeToolType === '2D') {
          this.active2DToolIndex = toolIndex;
        } else if (this.activeToolType === '3D') {
          this.active3DToolIndex = toolIndex;
        }
        this.$emit('enable', true);
      }
    },
    enableActiveTool() {
      if (
        this.targetPid !== -1 &&
        (this.active2DToolIndex !== undefined ||
          this.active3DToolIndex !== undefined) &&
        this.activeToolType !== undefined
      ) {
        this.pendingTool =
          this.activeToolType === '2D'
            ? ToolList2D[this.active2DToolIndex]
            : ToolList3D[this.active3DToolIndex];
      }
    },
    clearActiveTool() {
      this.pendingTool = null;
      this.active2DToolIndex = undefined;
      this.active3DToolIndex = undefined;
      this.activeToolType = undefined;
    },
    removeTool(index) {
      if (this.pendingTool && index === this.tools.length - 1) {
        this.pendingTool = null;
        this.clearActiveTool();
      } else {
        this.removeMeasurementTool({
          datasetId: this.targetPid,
          index,
        });
      }
    },
    jumpTo(axis, slice) {
      if (slice !== null) {
        const view = this.$proxyManager
          .getViews()
          .find((v) => v.getAxis && v.getAxis() === axis);
        if (view) {
          const rep = view
            .getRepresentations()
            .find((r) => r.getInput() === this.targetProxy);
          if (rep) {
            rep.setSlice(slice);
          }
        }
      }
    },
    saveToolData(toolIndex, data) {
      // If pendingTool's data is saved, that means we need to commit
      // pendingTool to the store.
      if (this.pendingTool && toolIndex === this.tools.length - 1) {
        this.addMeasurementTool({
          datasetId: this.targetPid,
          componentName: this.pendingTool.component.name,
          data,
        });
        this.pendingTool = null;
        this.$emit('enable', false);
      } else {
        this.updateMeasurementTool({
          datasetId: this.targetPid,
          index: toolIndex,
          data,
        });
      }
    },
    upload() {
      if (this.targetProxy) {
        setTimeout(() => {
          this.$root.$emit('girder_upload_measurements', this.targetPid);
        }, 10);
      }
    },
  },
};
