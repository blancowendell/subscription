import React from 'react';
import { Drawer } from 'antd';

const AntdDrawer = ({
  isOpen,
  onClose,
  title = 'Details',
  children,
  width,
  position,
  drawerclassName,
  bodyStyle = {},
  // Adding zIndex as a prop, default 1000 so toast root (99999) stays on top
  zIndex = 1000, 
}) => {
  return (
    <Drawer
      title={<span className="dark:text-white font-semibold">{title}</span>}
      placement={position}
      closable={true}
      onClose={onClose}
      open={isOpen}
      width={width}
      zIndex={zIndex}
      /* CRITICAL: Just like the Modal, forcing the Drawer to the body 
         ensures it stays in a predictable stacking context.
      */
      getContainer={() => document.body}
      
      /* Pass Tailwind classes to the Drawer wrapper */
      className={`${drawerclassName} dark:bg-slate-900`}
      
      styles={{
        mask: {
          // Ensures the dark overlay also respects our zIndex logic
        },
        body: { 
          backgroundColor: 'transparent',
          ...bodyStyle 
        },
        header: {
          borderBottom: '1px solid rgba(156, 163, 175, 0.2)',
          backgroundColor: 'transparent',
        }
      }}
    >
      <div className="dark:text-gray-300 h-full">
        {children}
      </div>
    </Drawer>
  );
};

export default AntdDrawer;