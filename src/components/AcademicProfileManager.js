'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { updateUserPapers } from '@/app/actions'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import toast from 'react-hot-toast'

export function AcademicProfileManager({ allPapers, userPapers }) {
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = React.useState(false);
    const [selectedPapers, setSelectedPapers] = React.useState(new Set(userPapers.map(p => p.id)));
    const selectedPaperObjects = allPapers.filter(paper => selectedPapers.has(paper.id));

    const handleFormSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData();
        selectedPapers.forEach(id => formData.append('paperId', id));
        
        startTransition(async () => {
            const result = await updateUserPapers(formData);
            if (result.error) toast.error(result.error);
            else toast.success(result.success);
        });
    }

    return (
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-[40px]">
                        <div className="flex flex-wrap gap-1">
                            {selectedPaperObjects.length > 0 
                                ? selectedPaperObjects.map(p => <Badge key={p.id} variant="secondary">{p.title}</Badge>)
                                : "Yayınlarınızı seçin..."
                            }
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command><CommandInput placeholder="Makale ara..." /><CommandList><CommandEmpty>Makale bulunamadı.</CommandEmpty><CommandGroup>
                        {allPapers.map((paper) => (
                            <CommandItem key={paper.id} value={paper.title} onSelect={() => {
                                const newSelection = new Set(selectedPapers);
                                if (newSelection.has(paper.id)) newSelection.delete(paper.id);
                                else newSelection.add(paper.id);
                                setSelectedPapers(newSelection);
                            }}>
                                <Check className={cn("mr-2 h-4 w-4", selectedPapers.has(paper.id) ? "opacity-100" : "opacity-0")} />
                                {paper.title}
                            </CommandItem>
                        ))}
                    </CommandGroup></CommandList></Command>
                </PopoverContent>
            </Popover>
            <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>{isPending ? "Kaydediliyor..." : "Yayınları Kaydet"}</Button>
            </div>
        </form>
    );
}
