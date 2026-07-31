import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const mindmapData = {
  title: "COMP2010: AI Product Thinking",
  subtitle: "Sơ đồ Tư duy Kiến thức VinUniversity",
  nodes: [
    {
      id: "Day01",
      title: "Day 01: Models to Products",
      color: "#e2635c",
      desc: "Chuyển đổi bài toán AI thành Giá trị sản phẩm",
      children: [
        { label: "Kinh tế học AI & Dự đoán", code: "T01-005", status: "mastered" },
        { label: "Amazon Anticipatory Shipping", code: "T01-009", status: "gap", text: "Lỗ hổng: Phân biệt Model.fit vs Market.fit" },
        { label: "5 Tiêu chí Nghiệm thu AI", code: "T01-015", status: "mastered" },
      ],
    },
    {
      id: "Day02",
      title: "Day 02: Product Definition",
      color: "#eaa04b",
      desc: "Xác định 3 trụ cột Desirability - Feasibility - Viability",
      children: [
        { label: "Công thức Mo.fit + α * Ma.fit", code: "T02-001", status: "mastered" },
        { label: "Tesla Autonomous Vehicle Case", code: "T02-008", status: "gap", text: "Lỗ hổng: Innovation Sweet Spot" },
        { label: "Đo lường Feasibility AI", code: "T02-012", status: "mastered" },
      ],
    },
    {
      id: "Day03",
      title: "Day 03: Product-Market Fit",
      color: "#1f7d76",
      desc: "Khám phá Nhu cầu & Phân khúc Khách hàng Target",
      children: [
        { label: "Problem vs Solution Space", code: "T03-001", status: "mastered" },
        { label: "Công thức GAP = Importance - Satisfaction", code: "T03-009", status: "mastered" },
        { label: "User Personas & Customer Segment", code: "T03-014", status: "mastered" },
      ],
    },
    {
      id: "Day04",
      title: "Day 04: Build, Measure, Learn",
      color: "#e2635c",
      desc: "Thử nghiệm MVP & Kiểm thử Giả định Sản phẩm",
      children: [
        { label: "Wizard of Oz & Concierge MVP", code: "T04-005", status: "gap", text: "Lỗ hổng: Tránh bẫy AI-Washing" },
        { label: "Tháp Prototype Andrew Ng", code: "T04-010", status: "mastered" },
      ],
    },
    {
      id: "Day05",
      title: "Day 05: Go-To-Market (GTM)",
      color: "#eaa04b",
      desc: "Chiến lược Thương mại hóa & Phân phối",
      children: [
        { label: "Tesla Roadster Luxury Adopters", code: "T05-004", status: "mastered" },
        { label: "Triết lý Inbound Marketing", code: "T05-009", status: "mastered" },
      ],
    },
    {
      id: "Day06",
      title: "Day 06: Metrics & Monetization",
      color: "#1f7d76",
      desc: "Mô hình Doanh thu & Chỉ số Unit Economics",
      children: [
        { label: "Slack Freemium Conversion Tier", code: "T06-003", status: "mastered" },
        { label: "Unit Economics & CAC / LTV", code: "T06-004", status: "gap", text: "Lỗ hổng: Vanity Metrics vs Conversion" },
      ],
    },
  ],
};

// --- Custom node shells --------------------------------------------------

const HANDLE_SIDES = [
  { key: "top", position: Position.Top },
  { key: "right", position: Position.Right },
  { key: "bottom", position: Position.Bottom },
  { key: "left", position: Position.Left },
];

const hiddenHandleStyle = { opacity: 0, width: 6, height: 6, border: "none", background: "transparent" };

// Every node gets a handle on all 4 sides so edges can attach on whichever
// side actually faces the other node, since branches sit all around the hub.
function QuadHandles({ roles }) {
  return HANDLE_SIDES.flatMap(({ key, position }) => {
    const out = [];
    if (roles.includes("src")) {
      out.push(<Handle key={`${key}-src`} id={`${key}-src`} type="source" position={position} style={hiddenHandleStyle} />);
    }
    if (roles.includes("tgt")) {
      out.push(<Handle key={`${key}-tgt`} id={`${key}-tgt`} type="target" position={position} style={hiddenHandleStyle} />);
    }
    return out;
  });
}

function HubNode({ data }) {
  return (
    <div className="rf-hub-node">
      <QuadHandles roles={["src"]} />
      <span className="hub-face" aria-hidden="true">🧑‍🎓</span>
      <div className="hub-title">{data.title}</div>
      <div className="hub-subtag">{data.subtitle}</div>
    </div>
  );
}

function BranchNode({ data }) {
  return (
    <div
      className={`rf-branch-node ${data.isActive ? "is-active" : ""}`}
      style={{ background: data.color }}
      onClick={data.onSelect}
    >
      <QuadHandles roles={["src", "tgt"]} />
      <div className="branch-node-title">{data.title}</div>
      <div className="branch-node-desc">{data.desc}</div>
      <div className="branch-node-count">{data.count} khái niệm</div>
    </div>
  );
}

function ChipNode({ data }) {
  const slideNum = data.code ? parseInt(data.code.split('-')[1] || '1', 10) : 1;
  const slideTag = `Slide ${String(slideNum).padStart(2, '0')}`;

  return (
    <div
      className={`rf-chip-node ${data.status === "gap" ? "is-gap" : ""}`}
      style={{ borderColor: data.color }}
      onClick={data.onSelect}
      title={`Bấm để trượt đến ${slideTag}`}
    >
      <QuadHandles roles={["tgt"]} />
      {data.status === "gap" && <span className="chip-gap-icon">⚠️</span>}
      <span className="chip-label">{data.label}</span>
      {data.code && <span className="chip-code">{slideTag}</span>}
    </div>
  );
}

const nodeTypes = { hub: HubNode, branch: BranchNode, chip: ChipNode };

// --- Radial layout math ---------------------------------------------------

const BRANCH_RADIUS = 300;
const CHILD_RADIUS = 520;
const CHILD_SPREAD_DEG = 24;

const toRad = (deg) => (deg * Math.PI) / 180;

function sectorFor(deg) {
  const a = ((deg % 360) + 360) % 360;
  if (a >= 315 || a < 45) return "right";
  if (a >= 45 && a < 135) return "bottom";
  if (a >= 135 && a < 225) return "left";
  return "top";
}

const OPPOSITE_SECTOR = { top: "bottom", bottom: "top", left: "right", right: "left" };

function buildGraph({ activeDay, onSelectBranch, onSelectChild }) {
  const nodes = [
    {
      id: "hub",
      type: "hub",
      position: { x: -150, y: -62 },
      draggable: false,
      selectable: false,
      data: { title: mindmapData.title, subtitle: mindmapData.subtitle },
    },
  ];
  const edges = [];
  const branchCount = mindmapData.nodes.length;

  mindmapData.nodes.forEach((branch, i) => {
    const angle = -90 + i * (360 / branchCount);
    const sector = sectorFor(angle);
    const targetSector = OPPOSITE_SECTOR[sector];
    const bx = Math.cos(toRad(angle)) * BRANCH_RADIUS;
    const by = Math.sin(toRad(angle)) * BRANCH_RADIUS;

    nodes.push({
      id: branch.id,
      type: "branch",
      position: { x: bx - 95, y: by - 34 },
      draggable: false,
      selectable: false,
      data: {
        title: branch.title,
        desc: branch.desc,
        color: branch.color,
        count: branch.children.length,
        isActive: activeDay === branch.id,
        onSelect: () => onSelectBranch(branch.id),
      },
    });

    edges.push({
      id: `e-hub-${branch.id}`,
      source: "hub",
      target: branch.id,
      sourceHandle: `${sector}-src`,
      targetHandle: `${targetSector}-tgt`,
      style: { stroke: branch.color, strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: branch.color, width: 16, height: 16 },
    });

    const childCount = branch.children.length;
    branch.children.forEach((child, j) => {
      const spread = (j - (childCount - 1) / 2) * CHILD_SPREAD_DEG;
      const childAngle = angle + spread;
      const childSector = sectorFor(childAngle);
      const childTargetSector = OPPOSITE_SECTOR[childSector];
      const cx = Math.cos(toRad(childAngle)) * CHILD_RADIUS;
      const cy = Math.sin(toRad(childAngle)) * CHILD_RADIUS;
      const childId = `${branch.id}-c${j}`;

      nodes.push({
        id: childId,
        type: "chip",
        position: { x: cx - 85, y: cy - 18 },
        draggable: false,
        selectable: false,
        data: {
          ...child,
          color: branch.color,
          onSelect: () => onSelectChild(child),
        },
      });

      edges.push({
        id: `e-${branch.id}-${childId}`,
        source: branch.id,
        target: childId,
        sourceHandle: `${sector}-src`,
        targetHandle: `${childTargetSector}-tgt`,
        style: { stroke: branch.color, strokeWidth: 1.5, strokeDasharray: "5 4" },
      });
    });
  });

  return { nodes, edges };
}

import { fetchMindmap } from "../services/apiClient.js";

const BRANCH_COLORS = ["#e2635c", "#eaa04b", "#1f7d76", "#3b82f6", "#8b5cf6", "#ec4899"];

function buildGraphFromBackendTree(tree, activeBranchId, onSelectBranch, onSelectChild) {
  const nodes = [
    {
      id: "hub",
      type: "hub",
      position: { x: -150, y: -62 },
      draggable: false,
      selectable: false,
      data: { title: tree.title || mindmapData.title, subtitle: tree.summary || mindmapData.subtitle },
    },
  ];
  const edges = [];
  const sections = tree.children || [];
  const branchCount = sections.length;

  sections.forEach((section, i) => {
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
    const angle = -90 + i * (360 / Math.max(1, branchCount));
    const sector = sectorFor(angle);
    const targetSector = OPPOSITE_SECTOR[sector];
    const bx = Math.cos(toRad(angle)) * BRANCH_RADIUS;
    const by = Math.sin(toRad(angle)) * BRANCH_RADIUS;

    nodes.push({
      id: section.id,
      type: "branch",
      position: { x: bx - 95, y: by - 34 },
      draggable: false,
      selectable: false,
      data: {
        title: section.title,
        desc: section.summary,
        color: color,
        count: section.children?.length || 0,
        isActive: activeBranchId === section.id,
        onSelect: () => onSelectBranch(section.id),
      },
    });

    edges.push({
      id: `e-hub-${section.id}`,
      source: "hub",
      target: section.id,
      sourceHandle: `${sector}-src`,
      targetHandle: `${targetSector}-tgt`,
      style: { stroke: color, strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: color, width: 16, height: 16 },
    });

    const topics = section.children || [];
    const childCount = topics.length;
    topics.forEach((topic, j) => {
      const spread = (j - (childCount - 1) / 2) * CHILD_SPREAD_DEG;
      const childAngle = angle + spread;
      const childSector = sectorFor(childAngle);
      const childTargetSector = OPPOSITE_SECTOR[childSector];
      const cx = Math.cos(toRad(childAngle)) * CHILD_RADIUS;
      const cy = Math.sin(toRad(childAngle)) * CHILD_RADIUS;

      const firstSource = topic.sources?.[0];
      const slideIndex = firstSource?.slide_index || topic.coverage?.start_slide_index || 1;
      const slideCode = `T01-${String(slideIndex).padStart(3, '0')}`;

      nodes.push({
        id: topic.id,
        type: "chip",
        position: { x: cx - 85, y: cy - 18 },
        draggable: false,
        selectable: false,
        data: {
          label: topic.title,
          code: slideCode,
          status: topic.importance?.level === "important" ? "gap" : "mastered",
          text: topic.summary || topic.importance?.reason,
          color: color,
          onSelect: () => onSelectChild({ label: topic.title, code: slideCode, text: topic.summary }),
        },
      });

      edges.push({
        id: `e-${section.id}-${topic.id}`,
        source: section.id,
        target: topic.id,
        sourceHandle: `${sector}-src`,
        targetHandle: `${childTargetSector}-tgt`,
        style: { stroke: color, strokeWidth: 1.5, strokeDasharray: "5 4" },
      });
    });
  });

  return { nodes, edges };
}

// --- Component -------------------------------------------------------------

export default function MindmapSideView({ onSelectSlide, deckId = "deck_demo" }) {
  const [activeDay, setActiveDay] = useState("Day01");
  const [selectedNode, setSelectedNode] = useState(null);
  const [backendTree, setBackendTree] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    fetchMindmap(deckId).then((res) => {
      if (res && res.tree) {
        setBackendTree(res.tree);
        setIsBackendConnected(true);
        if (res.tree.children && res.tree.children[0]) {
          setActiveDay(res.tree.children[0].id);
        }
      }
    });
  }, [deckId]);

  const handleSelectBranch = useCallback((id) => setActiveDay(id), []);
  const handleSelectChild = useCallback(
    (child) => {
      setSelectedNode(child);
      if (onSelectSlide && child.code) onSelectSlide(child.code);
    },
    [onSelectSlide]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (backendTree) {
      return buildGraphFromBackendTree(backendTree, activeDay, handleSelectBranch, handleSelectChild);
    }
    return buildGraph({ activeDay, onSelectBranch: handleSelectBranch, onSelectChild: handleSelectChild });
  }, [backendTree, activeDay, handleSelectBranch, handleSelectChild]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="mindmap-tree-workspace">
      {/* Mindmap Header Bar */}
      <div className="mindmap-tree-header">
        <div className="mindmap-tree-header__title">
          <h3>🗺️ Sơ đồ Tư duy (Mind Map)</h3>
          <p>{mindmapData.subtitle}</p>
        </div>
        <span className="live-ai-badge">LIVE AI GRAPH</span>
      </div>

      {/* React Flow Mindmap Canvas */}
      <div className="mindmap-flow-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.35 }}
            minZoom={0.3}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#c9b48c" />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        </ReactFlowProvider>

        {/* Decorative floating icons, purely cosmetic */}
        <span className="mindmap-decor decor-bulb" aria-hidden="true">💡</span>
        <span className="mindmap-decor decor-key" aria-hidden="true">🔑</span>
        <span className="mindmap-decor decor-search" aria-hidden="true">🔍</span>
        <span className="mindmap-decor decor-pencil" aria-hidden="true">📝</span>
        <span className="mindmap-decor decor-plane" aria-hidden="true">✈️</span>
      </div>

      {/* Interactive Node Details Banner */}
      {selectedNode && (
        <div className="mindmap-node-banner">
          <div className="banner-info">
            <strong>{selectedNode.label}</strong> [Slide {selectedNode.code ? parseInt(selectedNode.code.split('-')[1] || '1', 10) : 1}]
            {selectedNode.text && <p className="gap-text">{selectedNode.text}</p>}
          </div>
          <button
            type="button"
            className="btn-jump-slide"
            onClick={() => onSelectSlide && onSelectSlide(selectedNode.code)}
          >
            Trượt đến Slide này →
          </button>
        </div>
      )}
    </div>
  );
}
