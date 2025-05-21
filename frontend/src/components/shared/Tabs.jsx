import React, { Children, cloneElement, useState, useRef, useEffect } from 'react';

const Tabs = ({ children, activeTab, onChange }) => {
  const [currentTab, setCurrentTab] = useState(activeTab || '');
  const tabsRef = useRef(null);

  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    } else if (Children.count(children) > 0) {
      // Set the first tab as active if none specified
      const firstTabId = Children.toArray(children)[0].props.id;
      setCurrentTab(firstTabId);
    }
  }, [activeTab, children]);

  const handleTabClick = (tabId) => {
    setCurrentTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  const childrenArray = Children.toArray(children);

  return (
    <div>
      {/* Tab navigation */}
      <div className="border-b border-gray-200" ref={tabsRef}>
        <nav className="flex -mb-px space-x-8 overflow-x-auto px-4" aria-label="Tabs">
          {childrenArray.map((child) => {
            // Kiểm tra xem child.props có tồn tại và có id không
            if (!child || !child.props || !child.props.id) {
              return null; // Bỏ qua tab không hợp lệ
            }

            const { id, label, icon: Icon } = child.props;
            const isActive = currentTab === id;

            return (
              <button
                key={id}
                id={`tab-${id}`}
                aria-controls={`tabpanel-${id}`}
                aria-selected={isActive}
                role="tab"
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                onClick={() => handleTabClick(id)}
              >
                {Icon && (
                  <Icon
                    className={`-ml-0.5 mr-2 h-5 w-5 ${isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`}
                    aria-hidden="true"
                  />
                )}
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels */}
      <div className="mt-2">
        {childrenArray.map((child) => {
          // Kiểm tra xem child và child.props có tồn tại không
          if (!child || !child.props || !child.props.id) {
            return null; // Bỏ qua tab không hợp lệ
          }

          return cloneElement(child, {
            key: child.props.id,
            isActive: currentTab === child.props.id,
            onClick: () => handleTabClick(child.props.id)
          });
        })}
      </div>
    </div>
  );
};

export default Tabs;