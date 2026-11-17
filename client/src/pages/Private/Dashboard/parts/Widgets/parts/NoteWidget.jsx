import React from "react";
import WidgetCard from "./WidgetCard";

const NoteWidget = ({ widget, color, icon, editing }) => (
  <WidgetCard title={widget.title} icon={icon} color={color} tint>
    <p className="h-full overflow-auto text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-200">
      {widget.content || (editing ? "Write your note in the panel on the right." : "")}
    </p>
  </WidgetCard>
);

export default NoteWidget;
