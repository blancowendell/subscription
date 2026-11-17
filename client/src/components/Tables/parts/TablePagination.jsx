import React from 'react';
import { Pagination } from 'antd';

const TablePagination = ({ currentPage, totalPages, onPageChange, footerSummary }) => {
    return (
        <div
            className="mt-4 text-sm pt-4 flex justify-between items-center px-4 bg-white dark:bg-slate-900 transition-colors duration-300"
            style={{
                borderTop: '2px solid var(--main-color)',
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
            }}
        >
            {/* LEFT SIDE: Page Info & Summary */}
            <div className="flex flex-col">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Page {currentPage} of {totalPages || 1}
                </p>

                {footerSummary && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {footerSummary}
                    </div>
                )}
            </div>

            {/* RIGHT SIDE: Ant Design Pagination */}
            <Pagination
                current={currentPage}
                total={totalPages * 10}
                pageSize={10}
                onChange={onPageChange}
                showSizeChanger={false}
                className="dark-pagination"
                hideOnSinglePage
                itemRender={(page, type, originalElement) => {
                    const isPrev = type === 'prev';
                    const isNext = type === 'next';

                    if (isPrev || isNext) {
                        const isDisabled = isPrev 
                            ? currentPage === 1 
                            : (currentPage === totalPages || totalPages === 0);

                        return (
                            <button
                                disabled={isDisabled}
                                className="transition-all duration-200"
                                style={{
                                    border: '1px solid var(--main-color)',
                                    borderRadius: '6px',
                                    padding: '4px 16px',
                                    // Logic for disabled vs active colors
                                    backgroundColor: isDisabled 
                                        ? 'rgba(156, 163, 175, 0.1)' // Muted transparent gray
                                        : 'transparent',
                                    color: isDisabled 
                                        ? '#6b7280' // Gray-500
                                        : 'var(--main-color)',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isDisabled ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    if (!isDisabled) {
                                        e.currentTarget.style.backgroundColor = 'var(--main-hover-color)';
                                        e.currentTarget.style.color = 'var(--main-text-color)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isDisabled) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'var(--main-color)';
                                    }
                                }}
                            >
                                {isPrev ? 'Previous' : 'Next'}
                            </button>
                        );
                    }
                    
                    // Return the standard page numbers (handled via CSS in index.css)
                    return originalElement;
                }}
            />
        </div>
    );
};

export default TablePagination;