// import React from 'react';
// import { Drawer } from 'antd';

// const AntdDrawer = ({
//   isOpen,
//   onClose,
//   title = 'Details',
//   children,
//   width,
//   position,
//   drawerclassName,
//   bodyStyle = {},
// }) => {
//   return (
//     <Drawer
//       title={title}
//       placement={position}
//       closable={true}
//       onClose={onClose}
//       open={isOpen}
//       width={width}
//       className={drawerclassName}
//       bodyStyle={bodyStyle}
//     >
//       {children}
//     </Drawer>
//   );
// };

// export default AntdDrawer;

import React from 'react';
import { Drawer } from 'antd';

const AntdDrawer = ({
  isOpen,
  onClose,
  title = 'Details',
  children,
  width = 550, // Default width set to 550
  position = 'right', // Default position to right
  drawerclassName = '',
  bodyStyle = {},
}) => {
  // Define our shared themed background and padding
  const defaultBodyStyles = {
    backgroundColor: 'var(--bg-secondary)',
    padding: '24px', // Default padding as requested
    ...bodyStyle,
  };

  return (
    <Drawer
      title={
        <div className="text-gray-800 dark:text-gray-100 font-bold transition-colors">
          {title}
        </div>
      }
      placement={position}
      closable={true}
      onClose={onClose}
      open={isOpen}
      width={width}
      className={`${drawerclassName} dark-mode-drawer`}
      /* Ant Design v5 Styles */
      styles={{
        header: {
          borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.1))',
          backgroundColor: 'var(--bg-secondary)',
        },
        body: defaultBodyStyles,
        mask: {
          backdropFilter: 'blur(4px)',
        },
      }}
      /* Fallback for older AntD versions */
      bodyStyle={defaultBodyStyles}
    >
      {/* Wrapper div to ensure the text inside the drawer 
          defaults to the correct theme color 
      */}
      <div className="text-gray-900 dark:text-gray-200 h-full transition-colors">
        {children}
      </div>
    </Drawer>
  );
};

export default AntdDrawer;