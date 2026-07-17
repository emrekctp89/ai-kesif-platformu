'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteProject } from '@/app/actions';

function DeleteProjectButton({ projectId }) {
  const t = useTranslations('ProfileComponents');

  const handleFormAction = async (formData) => {
    const result = await deleteProject(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(t('projectDeleted'));
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t('delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirmDeleteProject')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('dismiss')}</AlertDialogCancel>
          <form action={handleFormAction}>
            <input type="hidden" name="id" value={projectId} />
            <AlertDialogAction type="submit">{t('confirmYesDelete')}</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProjectList({ projects }) {
  const t = useTranslations('ProfileComponents');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';

  if (!projects || projects.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('projectsEmpty')}</p>;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3 glass-panel"
        >
          <div className="min-w-0">
            <p className="font-medium">{project.title}</p>
            <p className="text-xs text-muted-foreground">
              {t('lastUpdated', {
                date: new Date(project.updated_at || project.created_at).toLocaleDateString(
                  dateLocale
                ),
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/profile/projects/${project.id}/edit`} prefetch={false}>
                {t('manage')}
              </Link>
            </Button>
            <DeleteProjectButton projectId={project.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
