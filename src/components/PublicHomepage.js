import React from 'react';
import { FilterSheet } from './FilterSheet';
import { InfiniteToolsList } from './InfiniteToolsList';
import { SiteBanner } from './SiteBanner';
import { TrendingTools } from './TrendingTools';

export function PublicHomepage({ initialTools, categories, tags }) {
    return (
        <>
            <SiteBanner />
            <TrendingTools />
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-center mb-8">AI Araçlarını Keşfedin</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <aside className="md:col-span-1">
                        <div className="sticky top-24">
                            <FilterSheet categories={categories} tags={tags} />
                        </div>
                    </aside>
                    <main className="md:col-span-3">
                        <InfiniteToolsList 
                            initialTools={initialTools}
                            user={null}
                            favoriteToolIds={new Set()}
                        />
                    </main>
                </div>
            </div>
        </>
    );
}
