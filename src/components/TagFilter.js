'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function TagFilter({ allTags }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // URL'den mevcut etiketleri alıp bir Set'e dönüştürüyoruz
    const selectedTagIds = React.useMemo(() => {
        const tags = searchParams.get('tags');
        return new Set(tags ? tags.split(',').map(Number) : []);
    }, [searchParams]);

    const selectedTagObjects = allTags.filter(tag => selectedTagIds.has(tag.id));

    const handleSelect = (tagId) => {
        const newSelection = new Set(selectedTagIds);
        if (newSelection.has(tagId)) {
            newSelection.delete(tagId);
        } else {
            newSelection.add(tagId);
        }

        const newParams = new URLSearchParams(searchParams.toString());
        if (newSelection.size > 0) {
            newParams.set('tags', Array.from(newSelection).join(','));
        } else {
            newParams.delete('tags');
        }
        // Sayfa parametresini sıfırlayarak filtre değiştiğinde 1. sayfaya dönülmesini sağlıyoruz
        newParams.delete('page');

        router.push(`/?${newParams.toString()}`);
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 w-full md:w-auto border-dashed">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Etikete Göre Filtrele
                    {selectedTagObjects.length > 0 && (
                        <>
                            <div className="mx-2 h-4 w-px bg-muted-foreground" />
                            <div className="space-x-1 lg:flex">
                                {selectedTagObjects.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedTagObjects.length} seçili
                                    </Badge>
                                ) : (
                                    selectedTagObjects.map(tag => (
                                        <Badge key={tag.id} variant="secondary" className="rounded-sm px-1 font-normal">
                                            {tag.name}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Etiket ara..." />
                    <CommandList>
                        <CommandEmpty>Etiket bulunamadı.</CommandEmpty>
                        <CommandGroup>
                            {allTags.map((tag) => (
                                <CommandItem
                                    key={tag.id}
                                    value={tag.name}
                                    onSelect={() => handleSelect(tag.id)}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedTagIds.has(tag.id) ? "opacity-100" : "opacity-0")} />
                                    {tag.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
