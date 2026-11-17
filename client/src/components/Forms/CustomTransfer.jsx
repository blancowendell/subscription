import React, { useState } from "react";
import { TbChevronRight, TbChevronLeft, TbSearch } from "react-icons/tb";

const TransferList = ({ title, items, onAction, actionIcon, emptyText, showSearch }) => {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="flex-1 border rounded-lg flex flex-col h-[350px] transition-all duration-300"
      style={{ 
        backgroundColor: 'transparent',
        borderColor: 'rgba(156, 163, 175, 0.4)' // Matches your fieldset color
      }}
    >
      {/* Header */}
      <div 
        className="p-3 border-b flex justify-between items-center"
        style={{ 
          borderColor: 'rgba(156, 163, 175, 0.3)',
          backgroundColor: 'rgba(156, 163, 175, 0.08)' // Slight tint like your disabled state
        }}
      >
        <span className="font-semibold text-sm" style={{ color: 'var(--menu-text)' }}>
          {title}
        </span>
        <span 
          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{ 
            backgroundColor: 'var(--main-color)', 
            color: '#fff',
          }}
        >
          {filteredItems.length}
        </span>
      </div>

      {/* Search Input Area */}
      {showSearch && (
        <div className="p-2 border-b relative" style={{ borderColor: 'rgba(156, 163, 175, 0.2)' }}>
          <TbSearch 
            className="absolute left-4 top-1/2 -translate-y-1/2" 
            style={{ color: 'var(--menu-icon)' }}
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md outline-none transition-all duration-300"
            style={{ 
              backgroundColor: 'transparent',
              borderColor: 'rgba(156, 163, 175, 0.4)',
              color: 'var(--text-base)',
            }}
            // Dynamic focus styling to match FloatingInput
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--main-color)';
              e.target.style.boxShadow = '0 0 0 1px var(--main-color)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(156, 163, 175, 0.4)';
              e.target.style.boxShadow = 'none';
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div 
            className="text-center text-xs mt-10" 
            style={{ color: 'var(--menu-text)', opacity: 0.6 }}
          >
            {search ? "No matches found" : emptyText}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.value}
              onClick={() => onAction(item)}
              className="flex justify-between items-center p-2 rounded-md cursor-pointer group transition-all duration-200 border border-transparent"
              style={{ color: 'var(--text-base)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
                e.currentTarget.style.borderColor = 'var(--main-color)';
                e.currentTarget.style.color = 'var(--main-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-base)';
              }}
            >
              <span className="text-sm font-medium">
                {item.label}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--main-color)' }}>
                {actionIcon}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CustomTransfer = ({ dataSource = [], targetKeys = [], onChange, labels = {} }) => {
  const availableItems = dataSource.filter((item) => !targetKeys.includes(item.value));
  const selectedItems = dataSource.filter((item) => targetKeys.includes(item.value));

  const handleAdd = (item) => onChange([...targetKeys, item.value]);
  const handleRemove = (item) => onChange(targetKeys.filter((k) => k !== item.value));

  return (
    <div className="flex items-center gap-4 w-full">
      <TransferList
        title={labels.available || "Available"}
        items={availableItems}
        onAction={handleAdd}
        actionIcon={<TbChevronRight />}
        emptyText="All items assigned"
        showSearch
      />

      {/* Visual Separator Arrows */}
      <div className="flex flex-col gap-2" style={{ color: 'var(--menu-icon)', opacity: 0.5 }}>
        <TbChevronRight size={22} />
        <TbChevronLeft size={22} />
      </div>

      <TransferList
        title={labels.selected || "Selected"}
        items={selectedItems}
        onAction={handleRemove}
        actionIcon={<TbChevronLeft />}
        emptyText="Nothing selected"
        showSearch
      />
    </div>
  );
};

export default CustomTransfer;